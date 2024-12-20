import os
import pandas as pd

def combine_csv_files(directory):
    # List to hold dataframes
    combined_df = []

    # Walk through directory and subdirectories
    for root, dirs, files in os.walk(directory):
        for file in files:
            # Check if the file contains "HUMAN" in its name and is a CSV file
            if "HUMAN" in file and file.endswith(".csv"):
                file_path = os.path.join(root, file)
                # Read the CSV file
                df = pd.read_csv(file_path)
                combined_df.append(df)

    # Concatenate all dataframes
    if combined_df:
        result_df = pd.concat(combined_df, ignore_index=True)
        # Drop duplicate headers if any
        result_df = result_df.loc[:, ~result_df.columns.duplicated()]
        return result_df
    else:
        return None


# Directory containing the CSV files
directory = "DATASET/GUN"


# Combine CSV files and save to a new CSV file
combined_df = combine_csv_files(directory)
if combined_df is not None:
    combined_df.to_csv("combined_human_files.csv", index=False)
    print("CSV files combined successfully into 'combined_human_files.csv'.")
else:
    print("No CSV files containing 'HUMAN' found in the directory.")
