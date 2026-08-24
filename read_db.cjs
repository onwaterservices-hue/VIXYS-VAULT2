const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "btc15-pro--prediction-terminal",
  appId: "1:347364984617:web:b037e6dc85cd4c7cd6d938",
  apiKey: "AIzaSyDzktzOqh0RYXYCWGN2sAobaBgl73FRIoU",
  authDomain: "btc15-pro--prediction-terminal.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-btc15pro15minbtc-5ffd95f2-2d75-456b-8811-6d9cbc0c1c72");

async function run() {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let withPassword = 0;
    let withDayPass = 0;
    let withManualExtension = 0;
    let withSubscription = 0;
    let withOldFreeTrial = 0;
    let ownerRecord = null;
    let extensionField = null;

    usersSnap.forEach(doc => {
      const data = doc.data();
      const email = data.email?.toLowerCase();
      
      if (email === 'vixyvault0@gmail.com') {
        ownerRecord = data;
      }
      
      if (data.passwordHash && data.passwordHash.length > 0) withPassword++;
      if (data.dayPassActive) withDayPass++; // guessing field name, will dump
      if (data.subscription && data.subscription !== 'NONE') withSubscription++;
      if (data.freeTrial || data.trial || data.trialActive || data.freeTrialActive) withOldFreeTrial++;
      
      // Look for the 3-day extension logic.
      if (data.manualExtension || data.trialExtension || data.dayPassExtended) {
         withManualExtension++;
      }
    });

    console.log("Total users:", usersSnap.size);
    console.log("With password:", withPassword);
    console.log("With subscription:", withSubscription);
    console.log("With old free trial flags:", withOldFreeTrial);
    console.log("OWNER Record:", JSON.stringify(ownerRecord, null, 2));
    
    // Dump a few random users to understand fields
    let count = 0;
    console.log("--- SAMPLE USERS ---");
    usersSnap.forEach(doc => {
      if(count < 5) {
         console.log(JSON.stringify(doc.data(), null, 2));
         count++;
      }
    });

  } catch (err) {
    console.error(err);
  }
}
run();
