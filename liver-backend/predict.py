import sys
import json
import joblib
import numpy as np
import traceback

try:
    # read input JSON from Node
    input_json = sys.argv[1]
    data = json.loads(input_json)

    # load model and scaler
    model = joblib.load("model.pkl")
    scaler = joblib.load("scaler.pkl")

    # prepare features
    features = [
        data["Age"],
        data["Gender"],
        data["Total_Bilirubin"],
        data["Direct_Bilirubin"],
        data["Alkaline_Phosphotase"],
        data["SGPT_ALT"],
        data["SGOT_AST"],
        data["Total_Proteins"],
        data["Albumin"],
        data["Albumin_Globulin_Ratio"],
        data["Platelets"]
    ]

    features = np.array(features).reshape(1, -1)
    features_scaled = scaler.transform(features)

    prediction = model.predict(features_scaled)

    # return prediction to Node
    print(int(prediction[0]))

except Exception as e:
    print("ERROR:", traceback.format_exc())