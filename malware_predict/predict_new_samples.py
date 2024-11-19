# predict_new_samples.py

import pandas as pd
import pickle
import os
import sklearn


def scan():
    # Load the model
    with open('model/random_forest_model.pkl', 'rb') as file:
        random_forrest_model = pickle.load(file)

    # Check if the selected features file exists
    selected_features_path = 'model/Selected Features.pkl'
    print(f"Loading selected features from {selected_features_path}")
    if not os.path.exists(selected_features_path):
        print(f"Error: '{selected_features_path}' file not found.")
        exit(1)

    # Load the selected features
    with open(selected_features_path, 'rb') as file:
        selected_features = pickle.load(file)
    # print(f"Loaded selected features: {selected_features.tolist()}")

    # Load the extracted features from the CSV file
    extracted_features_file = 'model/extracted_features.csv'
    if not os.path.exists(extracted_features_file):
        print(f"Error: '{extracted_features_file}' file not found.")
        exit(1)

    extracted_features_data = pd.read_csv(extracted_features_file)

    # Ensure extracted_features_data contains expected features
    missing_features = set(selected_features) - set(extracted_features_data.columns)
    if missing_features:
        print(f"Warning: Expected features are missing in the new data: {missing_features}")

    # Filter the extracted_features_data to only contain the columns expected by the model
    extracted_features_data_filtered = extracted_features_data.reindex(columns=selected_features).fillna(0)


    # Make classification_results if there are rows available
    if not extracted_features_data_filtered.empty:
        classification_results = random_forrest_model.predict(extracted_features_data_filtered)

        probabilities = random_forrest_model.predict_proba(extracted_features_data_filtered)

        # Map classification_results to labels
        prediction_labels = ['Malicious' if pred == 0 else 'Benign' for pred in classification_results]

        # Extract probabilities for the predicted class
        prediction_certainty = [max(prob) for prob in probabilities]

        # Output results
        results = pd.DataFrame({
            'Name': extracted_features_data['Name'],
            'md5': extracted_features_data['md5'],
            'Prediction': prediction_labels,
            'Probability': prediction_certainty
        })
        print(results)
    else:
        print("No valid data available for prediction.")

if __name__ == "__main__":
    scan()