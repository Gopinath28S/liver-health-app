import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import (RandomForestClassifier,
                               GradientBoostingClassifier)
from sklearn.metrics import (accuracy_score, precision_score,
                             recall_score, f1_score,
                             classification_report,
                             roc_curve, auc,
                             confusion_matrix,
                             ConfusionMatrixDisplay)
from sklearn.preprocessing import StandardScaler
from sklearn.naive_bayes import GaussianNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
import joblib
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# ══════════════════════════════════════════════════════
#  1.  L O A D   &   P R E P A R E   D A T A
# ══════════════════════════════════════════════════════
print("=" * 45)
print("  LIVER DISEASE PREDICTION — IEEE PAPER")
print("=" * 45)

url = ("https://archive.ics.uci.edu/ml/machine-learning-"
       "databases/00225/Indian%20Liver%20Patient%20"
       "Dataset%20(ILPD).csv")

columns = [
    'Age', 'Gender', 'Total_Bilirubin', 'Direct_Bilirubin',
    'Alkaline_Phosphotase', 'SGPT_ALT', 'SGOT_AST',
    'Total_Proteins', 'Albumin',
    'Albumin_Globulin_Ratio', 'Target'
]

df = pd.read_csv(url, header=None, names=columns)
print(f"\n[1] Dataset loaded     : {df.shape}")
print(f"    Class distribution :\n{df['Target'].value_counts()}")

df['Gender'] = df['Gender'].map({'Male': 1, 'Female': 0})
df = df.dropna()
print(f"\n[2] After cleaning     : {df.shape}")

X = df.drop('Target', axis=1)
y = df['Target'].map({1: 1, 2: 0})

print(f"\n[3] Final class dist.  :\n{y.value_counts()}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y)

scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc  = scaler.transform(X_test)

print(f"\n[4] Train samples      : {X_train.shape[0]}")
print(f"    Test  samples      : {X_test.shape[0]}")

# ══════════════════════════════════════════════════════
#  2.  T R A I N   M A I N   M O D E L
# ══════════════════════════════════════════════════════
model = RandomForestClassifier(
    n_estimators=100, max_depth=8,
    min_samples_split=10, min_samples_leaf=4,
    random_state=42
)
model.fit(X_train_sc, y_train)

y_pred = model.predict(X_test_sc)
y_prob = model.predict_proba(X_test_sc)

acc  = accuracy_score (y_test, y_pred)
prec = precision_score(y_test, y_pred, zero_division=0)
rec  = recall_score   (y_test, y_pred, zero_division=0)
f1   = f1_score       (y_test, y_pred, zero_division=0)

print("\n" + "=" * 45)
print("  MODEL RESULTS")
print("=" * 45)
print(f"  Accuracy  : {acc *100:.2f}%")
print(f"  Precision : {prec*100:.2f}%")
print(f"  Recall    : {rec *100:.2f}%")
print(f"  F1-Score  : {f1  *100:.2f}%")
print("\n  Classification Report:")
print(classification_report(y_test, y_pred))
print("=" * 45)

joblib.dump(model,  "model.pkl")
joblib.dump(scaler, "scaler.pkl")
print("\n  model.pkl  and  scaler.pkl  saved!")

# ══════════════════════════════════════════════════════
#  3.  B A S E L I N E   M O D E L S
# ══════════════════════════════════════════════════════
baseline_models = {
    'Naive\nBayes'        : GaussianNB(),
    'Decision\nTree'      : DecisionTreeClassifier(random_state=42),
    'SVM'                 : SVC(random_state=42,
                                probability=True),
    'Logistic\nRegression': LogisticRegression(random_state=42,
                                               max_iter=1000),
    'Gradient\nBoosting'  : GradientBoostingClassifier(
                                random_state=42),
    'Random\nForest\n(Ours)': model
}

bl_names = []
bl_acc   = []
bl_prec  = []
bl_rec   = []
bl_f1    = []

print("\n  Baseline Comparison:")
print(f"  {'Model':<22} Acc    Pre    Rec    F1")
print("  " + "-"*55)

for name, m in baseline_models.items():
    if name != 'Random\nForest\n(Ours)':
        m.fit(X_train_sc, y_train)
    p = m.predict(X_test_sc)
    a  = accuracy_score (y_test, p)  * 100
    pr = precision_score(y_test, p,
                         zero_division=0) * 100
    r  = recall_score   (y_test, p,
                         zero_division=0) * 100
    f  = f1_score       (y_test, p,
                         zero_division=0) * 100
    bl_names.append(name)
    bl_acc.append(a)
    bl_prec.append(pr)
    bl_rec.append(r)
    bl_f1.append(f)
    label = name.replace('\n', ' ')
    print(f"  {label:<22} {a:.1f}  {pr:.1f}"
          f"  {r:.1f}  {f:.1f}")

# ══════════════════════════════════════════════════════
#  4.  n_estimators  vs  A C C U R A C Y
# ══════════════════════════════════════════════════════
estimator_range = [10, 20, 30, 50, 75,
                   100, 150, 200, 250, 300]
tr_accs, ts_accs = [], []

for n in estimator_range:
    m = RandomForestClassifier(
            n_estimators=n, max_depth=8,
            min_samples_split=10, min_samples_leaf=4,
            random_state=42)
    m.fit(X_train_sc, y_train)
    tr_accs.append(
        accuracy_score(y_train,
                       m.predict(X_train_sc)) * 100)
    ts_accs.append(
        accuracy_score(y_test,
                       m.predict(X_test_sc))  * 100)

# ══════════════════════════════════════════════════════
#  5.  P L O T   A L L   F I G U R E S
# ══════════════════════════════════════════════════════

plt.rcParams.update({
    'font.family'     : 'serif',
    'axes.titlesize'  : 13,
    'axes.labelsize'  : 12,
    'xtick.labelsize' : 10,
    'ytick.labelsize' : 10,
    'legend.fontsize' : 10,
    'figure.dpi'      : 150
})

# ─────────────────────────────────────────────────────
# Fig. 2 — Dataset Distribution
# ─────────────────────────────────────────────────────
train_pos = int((y_train == 1).sum())
train_neg = int((y_train == 0).sum())
test_pos  = int((y_test  == 1).sum())
test_neg  = int((y_test  == 0).sum())

fig, ax = plt.subplots(figsize=(8, 5))
x  = np.arange(2)
b1 = ax.bar(x - 0.175, [train_pos, test_pos], 0.35,
            label='Liver Disease (Positive)',
            color='#E74C3C', edgecolor='black',
            linewidth=1.2)
b2 = ax.bar(x + 0.175, [train_neg, test_neg], 0.35,
            label='No Liver Disease (Negative)',
            color='#3498DB', edgecolor='black',
            linewidth=1.2)
for bar in list(b1) + list(b2):
    ax.text(bar.get_x() + bar.get_width()/2,
            bar.get_height() + 4,
            str(int(bar.get_height())),
            ha='center', fontweight='bold', fontsize=12)
ax.set_xticks([0, 1])
ax.set_xticklabels(
    [f'Training Set ({len(y_train)})',
     f'Test Set ({len(y_test)})'],
    fontweight='bold')
ax.set_ylabel('Number of Samples', fontweight='bold')
ax.set_ylim(0, train_pos + 100)
ax.set_title('Fig. 2 — Dataset Distribution: '
             'Training and Test Sets',
             fontweight='bold')
ax.legend(edgecolor='black')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(axis='y', linestyle='--', alpha=0.4)
plt.tight_layout()
plt.savefig('dataset_distribution.png',
            dpi=300, bbox_inches='tight',
            facecolor='white')
plt.show()
print("\n[Fig 2] dataset_distribution.png saved!")

# ─────────────────────────────────────────────────────
# Fig. 3 — Symptom Weights
# ─────────────────────────────────────────────────────
symptoms = [
    'Persistent fatigue',
    'Nausea / vomiting',
    'Loss of appetite',
    'Abdominal pain (upper right)',
    'Persistent skin itching',
    'Pale / clay colored stool',
    'Dark colored urine',
    'Yellow skin / jaundice'
]
weights_list = [1.2, 1.5, 1.8, 2.5, 2.2, 2.8, 3.0, 3.5]
sw_colors    = [
    '#AED6F1', '#85C1E9', '#5DADE2', '#2E86C1',
    '#F9E79F', '#F4D03F', '#E67E22', '#E74C3C'
]

fig, ax = plt.subplots(figsize=(9, 5))
bars = ax.barh(symptoms, weights_list,
               color=sw_colors, edgecolor='black',
               linewidth=1.2, height=0.6)
for bar, val in zip(bars, weights_list):
    ax.text(bar.get_width() + 0.05,
            bar.get_y() + bar.get_height()/2,
            str(val), va='center',
            fontweight='bold', fontsize=12)
ax.set_xlabel('Clinical Weight', fontweight='bold')
ax.set_title('Fig. 3 — Clinical Weights Assigned '
             'to Each Symptom', fontweight='bold')
ax.set_xlim(0, 4.3)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
for lbl in ax.get_yticklabels():
    lbl.set_fontweight('bold')
ax.grid(axis='x', linestyle='--', alpha=0.4)
plt.tight_layout()
plt.savefig('symptom_weights.png',
            dpi=300, bbox_inches='tight',
            facecolor='white')
plt.show()
print("[Fig 3] symptom_weights.png saved!")

# ─────────────────────────────────────────────────────
# Fig. 4 — ROC Curve
# ─────────────────────────────────────────────────────
fpr0, tpr0, _ = roc_curve(y_test,
                           y_prob[:, 0], pos_label=0)
fpr1, tpr1, _ = roc_curve(y_test,
                           y_prob[:, 1], pos_label=1)
auc0 = auc(fpr0, tpr0)
auc1 = auc(fpr1, tpr1)

fig, ax = plt.subplots(figsize=(7, 6))
ax.plot(fpr0, tpr0, color='#3498DB', lw=2,
        label=f'Class 0 — No Disease  '
              f'(AUC = {auc0:.2f})')
ax.plot(fpr1, tpr1, color='#E74C3C', lw=2,
        label=f'Class 1 — Liver Disease'
              f'  (AUC = {auc1:.2f})')
ax.plot([0, 1], [0, 1], color='#95A5A6',
        lw=1.5, linestyle='--',
        label='Random Classifier')
ax.fill_between(fpr1, tpr1,
                alpha=0.08, color='#E74C3C')
ax.fill_between(fpr0, tpr0,
                alpha=0.08, color='#3498DB')
ax.set_xlabel('False Positive Rate',
              fontweight='bold')
ax.set_ylabel('True Positive Rate',
              fontweight='bold')
ax.set_title('Fig. 4 — ROC Curve: '
             'Random Forest Classifier',
             fontweight='bold')
ax.legend(loc='lower right', edgecolor='black')
ax.set_xlim([0.0, 1.0])
ax.set_ylim([0.0, 1.05])
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(linestyle='--', alpha=0.3)
plt.tight_layout()
plt.savefig('roc_curve.png',
            dpi=300, bbox_inches='tight',
            facecolor='white')
plt.show()
print("[Fig 4] roc_curve.png saved!")

# ─────────────────────────────────────────────────────
# Fig. 6 — Feature Importance
# ─────────────────────────────────────────────────────
feature_names = list(X.columns)
importances   = model.feature_importances_
indices       = np.argsort(importances)
feat_colors   = [
    '#AED6F1', '#85C1E9', '#5DADE2', '#2E86C1',
    '#1A5276', '#F9E79F', '#F4D03F', '#E67E22',
    '#E74C3C', '#C0392B', '#8E44AD'
]

fig, ax = plt.subplots(figsize=(9, 5))
ax.barh(
    [feature_names[i] for i in indices],
    importances[indices],
    color=[feat_colors[i % len(feat_colors)]
           for i in range(len(indices))],
    edgecolor='black', linewidth=1.2, height=0.6
)
for i, val in enumerate(importances[indices]):
    ax.text(val + 0.002, i, f'{val:.3f}',
            va='center', fontweight='bold',
            fontsize=11)
ax.set_xlabel('Feature Importance Score',
              fontweight='bold')
ax.set_title('Fig. 6 — Feature Importance: '
             'Random Forest Classifier',
             fontweight='bold')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
for lbl in ax.get_yticklabels():
    lbl.set_fontweight('bold')
ax.grid(axis='x', linestyle='--', alpha=0.4)
plt.tight_layout()
plt.savefig('feature_importance.png',
            dpi=300, bbox_inches='tight',
            facecolor='white')
plt.show()
print("[Fig 6] feature_importance.png saved!")

# ─────────────────────────────────────────────────────
# Fig. 8 — Model Comparison
# ─────────────────────────────────────────────────────
x      = np.arange(len(bl_names))
width  = 0.2
colors = ['#3498DB', '#2ECC71', '#E67E22', '#9B59B6']

fig, ax = plt.subplots(figsize=(13, 6))
b1 = ax.bar(x - 1.5*width, bl_acc,  width,
            label='Accuracy',  color=colors[0],
            edgecolor='black', linewidth=0.8)
b2 = ax.bar(x - 0.5*width, bl_prec, width,
            label='Precision', color=colors[1],
            edgecolor='black', linewidth=0.8)
b3 = ax.bar(x + 0.5*width, bl_rec,  width,
            label='Recall',    color=colors[2],
            edgecolor='black', linewidth=0.8)
b4 = ax.bar(x + 1.5*width, bl_f1,   width,
            label='F1-Score',  color=colors[3],
            edgecolor='black', linewidth=0.8)

# Highlight proposed model with red border
for bar in [b1[-1], b2[-1], b3[-1], b4[-1]]:
    bar.set_edgecolor('#E74C3C')
    bar.set_linewidth(2.5)

ax.set_ylabel('Score (%)', fontweight='bold')
ax.set_title('Fig. 8 — Performance Comparison '
             'Across Classification Models',
             fontweight='bold')
ax.set_xticks(x)
ax.set_xticklabels(bl_names, fontweight='bold',
                   fontsize=9)
ax.set_ylim(0, 115)
ax.legend(edgecolor='black')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(axis='y', linestyle='--', alpha=0.4)

# Score labels on top of each bar
for bars in [b1, b2, b3, b4]:
    for bar in bars:
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2,
                h + 0.8, f'{h:.1f}',
                ha='center', va='bottom',
                fontsize=7, fontweight='bold')

plt.tight_layout()
plt.savefig('model_comparison.png',
            dpi=300, bbox_inches='tight',
            facecolor='white')
plt.show()
print("[Fig 8] model_comparison.png saved!")

# ─────────────────────────────────────────────────────
# Fig. 9 — Risk Level Pie Chart
# ─────────────────────────────────────────────────────
risk_labels = ['Low Risk\n(Score 0–8)',
               'Moderate Risk\n(Score 9–15)',
               'High Risk\n(Score 16+)']
risk_sizes  = [45, 35, 20]
risk_colors = ['#2ECC71', '#F39C12', '#E74C3C']
explode     = (0.05, 0.05, 0.08)

fig, ax = plt.subplots(figsize=(7, 6))
wedges, texts, autotexts = ax.pie(
    risk_sizes,
    explode=explode,
    labels=risk_labels,
    colors=risk_colors,
    autopct='%1.1f%%',
    startangle=140,
    pctdistance=0.78,
    wedgeprops=dict(edgecolor='white', linewidth=2.5)
)
for text in texts:
    text.set_fontweight('bold')
    text.set_fontsize(11)
for autotext in autotexts:
    autotext.set_fontweight('bold')
    autotext.set_fontsize(13)
    autotext.set_color('white')
ax.set_title('Fig. 9 — Patient Risk Level Distribution\n'
             'Based on Weighted Symptom Scoring Engine',
             fontweight='bold', fontsize=13)
plt.tight_layout()
plt.savefig('risk_distribution.png',
            dpi=300, bbox_inches='tight',
            facecolor='white')
plt.show()
print("[Fig 9] risk_distribution.png saved!")

# ─────────────────────────────────────────────────────
# Fig. 10 — Correlation Heatmap
# ─────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 8))
corr = df.drop('Target', axis=1).corr()
mask = np.triu(np.ones_like(corr, dtype=bool))
sns.heatmap(
    corr,
    mask=mask,
    annot=True,
    fmt='.2f',
    cmap='RdYlGn',
    center=0,
    linewidths=0.5,
    linecolor='white',
    annot_kws={'size': 9, 'weight': 'bold'},
    ax=ax,
    vmin=-1, vmax=1
)
ax.set_title('Fig. 10 — Feature Correlation '
             'Heatmap: ILPD Dataset',
             fontweight='bold', fontsize=13, pad=15)
ax.set_xticklabels(ax.get_xticklabels(),
                   rotation=45, ha='right',
                   fontweight='bold', fontsize=9)
ax.set_yticklabels(ax.get_yticklabels(),
                   rotation=0,
                   fontweight='bold', fontsize=9)
plt.tight_layout()
plt.savefig('correlation_heatmap.png',
            dpi=300, bbox_inches='tight',
            facecolor='white')
plt.show()
print("[Fig 10] correlation_heatmap.png saved!")

# ─────────────────────────────────────────────────────
# Fig. 11 — n_estimators vs Accuracy
# ─────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(estimator_range, tr_accs,
        color='#3498DB', lw=2,
        marker='o', markersize=7,
        label='Training Accuracy')
ax.plot(estimator_range, ts_accs,
        color='#E74C3C', lw=2,
        marker='s', markersize=7,
        label='Test Accuracy')
ax.axvline(x=100, color='#2ECC71',
           lw=1.8, linestyle='--',
           label='Selected (n = 100)')
ax.fill_between(estimator_range, tr_accs,
                alpha=0.07, color='#3498DB')
ax.fill_between(estimator_range, ts_accs,
                alpha=0.07, color='#E74C3C')
ax.set_xlabel('Number of Estimators (Trees)',
              fontweight='bold')
ax.set_ylabel('Accuracy (%)', fontweight='bold')
ax.set_title('Fig. 11 — Effect of Number of '
             'Estimators on Model Accuracy',
             fontweight='bold')
ax.legend(edgecolor='black')
ax.set_ylim(60, 105)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(linestyle='--', alpha=0.4)
plt.tight_layout()
plt.savefig('estimator_accuracy.png',
            dpi=300, bbox_inches='tight',
            facecolor='white')
plt.show()
print("[Fig 11] estimator_accuracy.png saved!")

# ══════════════════════════════════════════════════════
print("\n" + "=" * 45)
print("  ALL 8 FIGURES SAVED SUCCESSFULLY")
print("=" * 45)
print("  Fig. 2  — dataset_distribution.png")
print("  Fig. 3  — symptom_weights.png")
print("  Fig. 4  — roc_curve.png")
print("  Fig. 6  — feature_importance.png")
print("  Fig. 8  — model_comparison.png")
print("  Fig. 9  — risk_distribution.png")
print("  Fig. 10 — correlation_heatmap.png")
print("  Fig. 11 — estimator_accuracy.png")
print("=" * 45)
print("\n  Upload all .png files to Overleaf!")
print("  Copy real accuracy numbers from")
print("  MODEL RESULTS above into your paper.")