# predict_new_samples.py

import pandas as pd
import pickle
import os

def scan():
    # Load the model
    with open('model/random_forest_model.pkl', 'rb') as file:
        model = pickle.load(file)

    # Check if the selected features file exists
    selected_features_path = 'model/Selected Features.pkl'
    print(f"Loading selected features from {selected_features_path}")
    if not os.path.exists(selected_features_path):
        print(f"Error: '{selected_features_path}' file not found. Please ensure the file exists in the correct directory.")
        exit(1)

    # Load the selected features
    with open(selected_features_path, 'rb') as file:
        selected_features = pickle.load(file)

    # Load the extracted features from the CSV file
    features_file = 'extracted_features.csv'
    if not os.path.exists(features_file):
        print(f"Error: '{features_file}' file not found. Please ensure the file exists in the correct directory.")
        exit(1)

    new_data = pd.read_csv(features_file)

    # Ensure the new data contains the expected features
    missing_features = set(selected_features) - set(new_data.columns)
    if missing_features:
        print(f"Warning: The following expected features are missing in the new data: {missing_features}")

    # Filter the new_data to only contain the columns expected by the model
    new_data_numeric = new_data.reindex(columns=selected_features).fillna(0)

    # Make predictions
    if not new_data_numeric.empty:
        predictions = model.predict(new_data_numeric)
        probabilities = model.predict_proba(new_data_numeric)

        # Map predictions to labels
        prediction_labels = ['Malicious' if pred == 0 else 'Benign' for pred in predictions]

        # Extract probabilities for the predicted class
        prediction_certainty = [max(prob) for prob in probabilities]

        # Output results
        results = pd.DataFrame({
            'Name': new_data['Name'],
            'md5': new_data['md5'],
            'Prediction': prediction_labels,
            'Probability': prediction_certainty
        })
        print(results)
    else:
        print("No valid data available for prediction.")

if __name__ == "__main__":
    scan()