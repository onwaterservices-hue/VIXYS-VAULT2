with open("firestore.rules", "r") as f:
    rules = f.read()

rule_to_add = """
    match /day_passes/{docId} {
      allow read, write: if true;
    }
"""

if "match /day_passes/" not in rules:
    rules = rules.replace("match /subscriptions/{subId} {", rule_to_add + "\n    match /subscriptions/{subId} {")
    with open("firestore.rules", "w") as f:
        f.write(rules)
