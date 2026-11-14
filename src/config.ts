export const BRAND = {
  name: "FieldShift",
  tagline: "A different season starts here.",
  team: "jt_1",
  description: "See the seasons. Understand the soil. Explore what comes next.",
};
export const asset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
export const MODEL_VERSION = "fieldshift-screening-0.1.0";
export const cropAsset = (id: string) =>
  ({
    wheat: "maize",
    maize: "maize",
    mung: "mungbean",
    cover: "mungbean",
    chickpea: "mungbean",
    tomato: "tomato",
    potato: "tomato",
    citrus: "citrus",
    mango: "citrus",
  })[id] || id;
export const MEMBERS = [
  "Shayan Amjad",
  "Ayaan Nasir Malik",
  "Alman Ali",
  "Taha Zeeshan",
  "Muhammad Asil",
  "Zayan Asif",
];
