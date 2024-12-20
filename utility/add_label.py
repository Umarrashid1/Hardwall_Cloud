import pandas as pd

# Read the input CSV file
input_file = "combined_human_files.csv"
output_file = "combined_human_files.csv"

# Load the CSV into a DataFrame
df = pd.read_csv(input_file)

# Add a new column "label" with value 1 for all rows
df['Injection'] = 0

# Save the updated DataFrame to a new CSV file
df.to_csv(output_file, index=False)

print(f"Updated file saved as {output_file}")
