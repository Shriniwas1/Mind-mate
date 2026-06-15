const { loadModel, predict } = require('./server/modelLoader');

async function test() {
  try {
    await loadModel();

    const testInputs = [
      "I feel very happy today",
      "I am extremely anxious about exams",
      "I feel sad and lonely",
      "I am excited and motivated!"
    ];

    for (let text of testInputs) {
      const result = await predict(text);
      console.log("\n📝 Input:", text);
      console.log("🎯 Prediction:", result.prediction);
    }

  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

test();