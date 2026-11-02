const test = require('node:test');
const assert = require('node:assert/strict');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const generateMissionImage = require('../image/generateMissionImage');

function countPixels(imageData, predicate) {
  let count = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    if (predicate(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2])) count += 1;
  }
  return count;
}

test('renders eight vertically stacked mission cards, explicit skips, portraits, and names', async (t) => {
  const png = await generateMissionImage([
    { mission: 'Locals', operators: [{ op: 'Miro', value: 496 }] },
    { mission: 'Skip', operators: [] },
    null,
    { mission: 'Breach', operators: [{ op: 'Chen Li', value: 247 }] }
  ]);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');

  const image = await loadImage(png);
  assert.equal(image.width, 1000);
  assert.ok(image.height > image.width, 'the cards should be stacked vertically');

  const canvas = createCanvas(image.width, image.height);
  t.after(() => {
    canvas.width = 0;
    canvas.height = 0;
  });
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  assert.deepEqual(Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3), [6, 28, 55]);

  const cardTops = [112, 364, 484, 604, 856, 976, 1096, 1216];
  for (let slot = 0; slot < 8; slot += 1) {
    const x = 32;
    const y = cardTops[slot];
    const title = context.getImageData(x + 12, y + 8, 320, 38);
    assert.ok(
      countPixels(title, (red, green, blue) => red > 220 && green > 220 && blue > 220) > 5,
      `M${slot + 1} should have a visible mission label`
    );
  }

  for (const slot of [1, 2, 4, 5, 6, 7]) {
    const skippedLabel = context.getImageData(332, cardTops[slot] + 45, 300, 38);
    assert.ok(
      countPixels(skippedLabel, (red, green, blue) => red > 200 && green < 130 && blue < 150) > 5,
      `M${slot + 1} skipped or unselected slot should display SKIPPED`
    );
  }

  const miroPortrait = context.getImageData(53, 184, 90, 90);
  const miroName = context.getImageData(54, 280, 88, 24);
  assert.ok(countPixels(miroPortrait, (r, g, b) => r !== 6 || g !== 28 || b !== 55) > 1000);
  assert.ok(countPixels(miroName, (r, g, b) => r > 220 && g > 220 && b > 220) > 5);
});

test('pads missing mission slots with visible skipped cards', async (t) => {
  const png = await generateMissionImage([]);
  const image = await loadImage(png);
  assert.equal(image.width, 1000);
  const canvas = createCanvas(image.width, image.height);
  t.after(() => {
    canvas.width = 0;
    canvas.height = 0;
  });
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const cardTop = 112;
  for (let slot = 0; slot < 8; slot += 1) {
    const y = cardTop + slot * 120;
    assert.ok(context.getImageData(44, y + 8, 320, 38).data.some((value, index) =>
      index % 4 !== 3 && value > 220
    ), `M${slot + 1} should have a visible skipped mission title`);
  }
});
