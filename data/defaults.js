/* ==========================================================================
   DetanZa — default site content.
   Used by the server when the database is empty, and by the browser as a
   fallback if the API is unreachable. Once you save anything in /admin,
   the database copy is used instead.
   ========================================================================== */
const TV = '/images/tan-vanish';

export default {
  settings: {
    announcement: 'New launch: Tan Vanish Cream — helps reduce tan in 20 minutes ✦ Order on WhatsApp',
    heroEyebrow: 'New Launch · Tan Vanish Cream',
    heroTitle: 'Reveal your natural glow',
    heroSubtitle:
      'Tan Vanish Cream with Gluta, Kojic & AHA helps reduce tan in just 20 minutes, restoring an even skin tone. pH balanced and gentle on skin.',
    heroCta: 'Shop Now',
    heroImage: '',
    aboutTitle: 'About DetanZa™',
    aboutText:
      'DetanZa™ is a beauty and skincare brand focused on simple, effective care for every skin. Our first launch, Tan Vanish Cream, brings a salon-style de-tan ritual home in three easy parts. We show you exactly how to use every product, so you get the best results every time.',
    whatsapp: '',
    email: '',
    phone: '',
    address: '',
    instagram: '',
    facebook: '',
    youtube: '',
  },
  products: [
    {
      id: 'tan-vanish-cream',
      name: 'Tan Vanish Cream',
      tagline: 'Helps reduce tan, reveals natural glow & restores even skin tone',
      category: 'De-Tan Care',
      price: null,
      mrp: null,
      size: '',
      badge: 'New Launch',
      image: `${TV}/box-3d.webp`,
      gallery: [`${TV}/front.webp`, `${TV}/directions.webp`, `${TV}/ingredients.webp`],
      description:
        'Tan Vanish Cream is a complete de-tan kit with three parts: Gluta-Kojic Lotion, Gluta-Kojic Powder and Barrier Protect Pre & Post Polish Cream. ' +
        'Powered by Gluta, Kojic and AHA, it helps reduce tan in 20 minutes, deep-cleanses and brightens, and restores an even skin tone. It is pH balanced and gentle on skin.\n\n' +
        'Use once a week, preferably in the evening. Do not use daily, or in both the morning and night. Follow the product instructions and do a patch test before each use.',
      benefits: [
        'Helps reduce tan in 20 minutes',
        'Reveals natural glow',
        'Restores even skin tone',
        'pH balanced',
        'Gentle on skin',
        'Deep cleansing & brightening',
        'With Gluta, Kojic & AHA',
        'Not tested on animals',
      ],
      howToUse: [
        'Patch test: apply a little on your forearm and wait 24 hours before full use.',
        'Mix the Gluta-Kojic Powder with the Gluta-Kojic Lotion for 2 minutes.',
        'Apply an even layer on the tanned area.',
        'Wait 10–20 minutes. The pack changes from pink to white.',
        'Rinse with water, then apply the Barrier Protect Pre & Post Polish Cream.',
        'Scan the QR code on the box to watch the how-to-use video.',
      ],
      ingredients:
        'Gluta-Kojic Lotion: D-Mineralized Water, Hydrogen Peroxide, Cetyl Alcohol, Light Liquid Paraffin, O-Phosphoric Acid, Actenelide.\n\n' +
        'Gluta-Kojic Powder: Sodium Persulphate, Sodium Carbonate, Potassium Persulphate, Carboxy Methyl Cellulose Sodium, Ethylene Diamine Tetra Acetic Acid, Maize Starch, Glutathione, Kojic Acid, Water Soluble Pink Colour.\n\n' +
        'Barrier Protect Pre & Post Polish Cream: Aqua (Water), Glycerin, Caprylic/Capric Triglyceride, Squalane, Cetearyl Alcohol, Cetearyl Olivate, Sorbitan Olivate, Niacinamide, Butyrospermum Parkii (Shea) Butter, Kojic Dipalmitate, Glutathione, Stearic Acid, Cholesterol, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Panthenol, Sodium Hyaluronate, Beta-Glucan, Allantoin, Tocopherol, Sodium Stearoyl Glutamate, Xanthan Gum, Disodium EDTA, Phenoxyethanol, Ethylhexylglycerin, Citric Acid.',
      caution:
        'For external use only. Do not apply on beard, eyebrows or moustache. Mixing the powder and lotion for 2 minutes is compulsory. ' +
        'Contains lightening agents like glutathione, kojic acid, sodium persulfate, arbutin and hydrogen peroxide, which may turn hair golden while removing the tan. ' +
        'We highly recommend a patch test before each use. If irritation occurs, consult a doctor.\n\n' +
        'Storage: keep in a cool, dry place away from direct sunlight and out of reach of children. Best used within 12 months of opening.',
      buyLink: '',
      featured: true,
      visible: true,
    },
  ],
  videos: [],
};
