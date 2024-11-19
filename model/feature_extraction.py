import pandas as pd
import pefile
import hashlib
import os
import math


def calculate_entropy(data):
    if not data:
        return 0
    length = len(data)
    byte_counts = [0] * 256
    for byte in data:
        byte_counts[byte] += 1
    entropy = -sum((count / length) * math.log2(count / length) for count in byte_counts if count > 0)
    return entropy


def get_section_entropies(pe):
    # Calculate minimum and maximum entropy for PE sections
    section_entropies = [calculate_entropy(section.get_data()) for section in pe.sections]
    sections_min_entropy = min(section_entropies) if section_entropies else 0
    sections_max_entropy = max(section_entropies) if section_entropies else 0
    return sections_min_entropy, sections_max_entropy


def get_resource_entropies(pe):
    # Calculate minimum and maximum entropy for PE resources
    resources_entropies = []
    if hasattr(pe, 'DIRECTORY_ENTRY_RESOURCE'):
        for resource in pe.DIRECTORY_ENTRY_RESOURCE.entries:
            if hasattr(resource, 'directory') and hasattr(resource.directory, 'entries'):
                for entry in resource.directory.entries:
                    if hasattr(entry, 'data') and hasattr(entry.data, 'struct'):
                        data_rva = entry.data.struct.OffsetToData
                        size = entry.data.struct.Size
                        data = pe.get_data(data_rva, size)
                        resources_entropies.append(calculate_entropy(data))
    resources_min_entropy = min(resources_entropies) if resources_entropies else 0
    resources_max_entropy = max(resources_entropies) if resources_entropies else 0
    return resources_min_entropy, resources_max_entropy


def get_file_headers(pe):
    # Extract file headers and optional headers
    return {
        'Machine': pe.FILE_HEADER.Machine,
        'SizeOfOptionalHeader': pe.FILE_HEADER.SizeOfOptionalHeader,
        'Characteristics': pe.FILE_HEADER.Characteristics,
        'MajorLinkerVersion': pe.OPTIONAL_HEADER.MajorLinkerVersion,
        'MinorLinkerVersion': pe.OPTIONAL_HEADER.MinorLinkerVersion,
        'SizeOfCode': pe.OPTIONAL_HEADER.SizeOfCode,
        'SizeOfInitializedData': pe.OPTIONAL_HEADER.SizeOfInitializedData,
        'SizeOfUninitializedData': pe.OPTIONAL_HEADER.SizeOfUninitializedData,
        'AddressOfEntryPoint': pe.OPTIONAL_HEADER.AddressOfEntryPoint,
        'BaseOfCode': pe.OPTIONAL_HEADER.BaseOfCode,
        'BaseOfData': getattr(pe.OPTIONAL_HEADER, 'BaseOfData', None),
        'ImageBase': pe.OPTIONAL_HEADER.ImageBase,
        'SectionAlignment': pe.OPTIONAL_HEADER.SectionAlignment,
        'FileAlignment': pe.OPTIONAL_HEADER.FileAlignment,
        'MajorOperatingSystemVersion': pe.OPTIONAL_HEADER.MajorOperatingSystemVersion,
        'MinorOperatingSystemVersion': pe.OPTIONAL_HEADER.MinorOperatingSystemVersion,
        'MajorImageVersion': pe.OPTIONAL_HEADER.MajorImageVersion,
        'MinorImageVersion': pe.OPTIONAL_HEADER.MinorImageVersion,
        'MajorSubsystemVersion': pe.OPTIONAL_HEADER.MajorSubsystemVersion,
        'MinorSubsystemVersion': pe.OPTIONAL_HEADER.MinorSubsystemVersion,
        'SizeOfImage': pe.OPTIONAL_HEADER.SizeOfImage,
        'SizeOfHeaders': pe.OPTIONAL_HEADER.SizeOfHeaders,
        'CheckSum': pe.OPTIONAL_HEADER.CheckSum,
        'Subsystem': pe.OPTIONAL_HEADER.Subsystem,
        'DllCharacteristics': pe.OPTIONAL_HEADER.DllCharacteristics,
        'SizeOfStackReserve': pe.OPTIONAL_HEADER.SizeOfStackReserve,
        'SizeOfStackCommit': pe.OPTIONAL_HEADER.SizeOfStackCommit,
        'SizeOfHeapReserve': pe.OPTIONAL_HEADER.SizeOfHeapReserve,
        'SizeOfHeapCommit': pe.OPTIONAL_HEADER.SizeOfHeapCommit,
        'LoaderFlags': pe.OPTIONAL_HEADER.LoaderFlags,
        'NumberOfRvaAndSizes': pe.OPTIONAL_HEADER.NumberOfRvaAndSizes,
    }


def extract_features(file_path):
    try:
        # Load PE file
        pe = pefile.PE(file_path)
        with open(file_path, 'rb') as f:
            file_data = f.read()

        # Extract section and resource entropies
        sections_min_entropy, sections_max_entropy = get_section_entropies(pe)
        resources_min_entropy, resources_max_entropy = get_resource_entropies(pe)

        # Extract headers
        headers = get_file_headers(pe)

        # Compile all features
        return {
            'Name': os.path.basename(file_path),
            'md5': hashlib.md5(file_data).hexdigest(),
            **headers,
            'SectionsNb': len(pe.sections),
            'ImportsNbDLL': len(pe.DIRECTORY_ENTRY_IMPORT) if hasattr(pe, 'DIRECTORY_ENTRY_IMPORT') else 0,
            'ExportsNb': len(pe.DIRECTORY_ENTRY_EXPORT.symbols) if hasattr(pe, 'DIRECTORY_ENTRY_EXPORT') else 0,
            'SectionsMinEntropy': sections_min_entropy,
            'SectionsMaxEntropy': sections_max_entropy,
            'ResourcesMinEntropy': resources_min_entropy,
            'ResourcesMaxEntropy': resources_max_entropy,
            'legitimate': 0,  # Placeholder
        }
    except pefile.PEFormatError:
        print(f"{file_path} is not a valid PE file.")
        return None
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None



def process_files_in_directory(directory_path):
    data = []
    output_file = 'extracted_features.csv'
    for file_name in os.listdir(directory_path):
        if file_name.endswith(('.exe', '.bin')):
            file_path = os.path.join(directory_path, file_name)
            features = extract_features(file_path)
            if features is not None:
                data.append(features)

    if data:
        df = pd.DataFrame(data)
        df.to_csv(output_file, index=False)
        print(f"Features extracted from files in {directory_path} and saved to {output_file}")
        return df
    else:
        print(f"No features extracted from files in {directory_path}")
        return None


if __name__ == "__main__":
    # Get the directory path
    directory_path = sys.argv[1]
    process_files_in_directory(directory_path)
    predict_new_samples.scan()
