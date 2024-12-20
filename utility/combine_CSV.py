import pandas as pd

# File paths
input_file_1 = "combined_human_files.csv"  # Path to the first CSV file
input_file_2 = "injection_attack_data.csv"  # Path to the second CSV file
output_file = "combined_dataset_TEST.csv"  # Path to the output CSV file

# Load both CSV files into DataFrames
df1 = pd.read_csv(input_file_1)
df2 = pd.read_csv(input_file_2)

# Combine the two DataFrames
combined_df = pd.concat([df1, df2], ignore_index=True)

# Save the combined DataFrame to a new CSV file
combined_df.to_csv(output_file, index=False)

print(f"Combined file saved as {output_file}")
