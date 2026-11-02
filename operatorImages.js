const raw = {
  apollon: "apollon.png.jpeg",
  batya: "batya.png.jpeg",
  boris: "boris.png.jpeg",
  capisce: "capisce.png.jpeg",
  charon: "charon.png.jpeg",
  chen_li: "chen_li.png.jpeg",
  chenli: "chen_li.png.jpeg", // alternate key for "Chen li"
  craig: "craig.png.jpeg",
  david: "david.png.jpeg",
  diana: "diana.png.jpeg",
  dmitry: "dmitry.png.jpeg",
  dutch: "dutch.png.jpeg",
  ferry: "ferry.png.jpeg",
  hawk: "hawk.png.jpeg",
  jason: "jason.png.jpeg",
  joe: "joe.png.jpeg",
  jp: "jp.png.jpeg",
  jb: "jp.png.jpeg",
  kirin: "kirin.png.jpeg",
  klaus: "klaus.png.jpeg",
  lens: "lens.png.jpeg",
  mcmean: "mcmean.png.jpeg",
  mia: "mia.png.jpeg",
  miro: "miro.png.jpeg",
  mishka: "mishka.png.jpeg",
  moses: "moses.png.jpeg",
  owen: "owen.png.jpeg",
  phoenix: "phoenix.png.jpeg",
  ray: "ray.png.jpeg",
  rey: "ray.png.jpeg", // alternate key for "Rey"
  rick: "rick.png.jpeg",
  rookie: "rookie.png.jpeg",
  snek: "snek.png.jpeg",
  spencer: "spencer.png.jpeg",
  syndrome: "syndrome.png.jpeg",
  thor: "thor.png.jpeg",
  travis: "travis.png.jpeg",
  valera: "valera.png.jpeg",
  varg: "varg.png.jpeg",
  victor: "victor.png.jpeg",
  whisper: "whisper.png.jpeg",
  wolf: "wolf.png.jpeg",
  zloy: "zloy.png.jpeg",
  shi: "shi.png.jpeg"
};

// Build normalized lookup (lowercased, remove non-alphanum) to support Linux deployments
function normalizeKey(name) {
  if (!name) return '';
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

const normalized = {};
for (const [k, v] of Object.entries(raw)) {
  normalized[k] = v;
  const nk = normalizeKey(k);
  if (nk && !normalized[nk]) normalized[nk] = v;
}

module.exports = normalized;
