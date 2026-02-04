import fs from "fs";
import admin from "firebase-admin";

import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const armors = JSON.parse(fs.readFileSync("./data/armors.json", "utf8"));

async function importArmors() {
	const batch = db.batch();

	armors.forEach(armor => {
		const ref = db.collection("armors").doc(armor.id);
		batch.set(ref, armor);
	});

	await batch.commit();
	console.log("✅ Armors imported successfully");
}

importArmors();
