export const CROP_GROUPS = [
  {
    id: "grains",
    name: "Grains",
    model: "maize",
    example: "Maize",
    crops: ["wheat", "maize"],
    note: "A detailed maize plant represents this group. Wheat has a different leaf and seed-head structure.",
  },
  {
    id: "pulses",
    name: "Pulses",
    model: "mungbean",
    example: "Mungbean",
    crops: ["mung", "chickpea"],
    note: "A pod-bearing mungbean plant represents this group. Chickpea foliage and pods differ.",
  },
  {
    id: "vegetables",
    name: "Vegetables",
    model: "tomato",
    example: "Tomato",
    crops: ["tomato", "potato"],
    note: "A tomato plant represents this group. Potato tubers grow below ground; this model does not depict them.",
  },
  {
    id: "fruit",
    name: "Fruit trees",
    model: "citrus",
    example: "Citrus",
    crops: ["citrus", "mango"],
    note: "A citrus-style tree represents this group. Mango leaves, fruit, canopy and mature height differ.",
  },
] as const;
export const groupForCrop = (id: string) =>
  CROP_GROUPS.find((g) => (g.crops as readonly string[]).includes(id)) ||
  CROP_GROUPS[0];
