import pandas as pd
import pefile
import hashlib
import os

def extract_features(file_path):
    try:
        # Attempt to load the file as a PE file
        pe = pefile.PE(file_path)
        with open(file_path, 'rb') as f:
            file_data = f.read()

        return {
            'Name': os.path.basename(file_path),
            'md5': hashlib.md5(file_data).hexdigest(),
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
            'BaseOfData': getattr(pe.OPTIONAL_HEADER, 'BaseOfData', None),  # BaseOfData may not exist in PE32+
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
            'SectionsNb': len(pe.sections),
            'ImportsNbDLL': len(pe.DIRECTORY_ENTRY_IMPORT) if hasattr(pe, 'DIRECTORY_ENTRY_IMPORT') else 0,
            'ExportsNb': len(pe.DIRECTORY_ENTRY_EXPORT.symbols) if hasattr(pe, 'DIRECTORY_ENTRY_EXPORT') else 0,
            'legitimate': 0,  # Placeholder; not used during testing
        }
    except pefile.PEFormatError:
        print(f"{file_path} is not a valid PE file.")
        return None
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def process_files_in_directory(directory_path, output_file):
    data = []
    for file_name in os.listdir(directory_path):
        # Process files with .exe and .bin extensions
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
    directory_path = '/home/ubuntu/Desktop/P5-Hardwall/MalwareClassifier/INFECTED/exe_files'
    output_file = 'extracted_features.csv'
    process_files_in_directory(directory_path, output_file)
