import { sensitivity } from "./engine";
import type { Day, Farm, Scenario } from "./types";
self.onmessage = (
  event: MessageEvent<{ farm: Farm; weather: Day[]; scenario: Scenario }>,
) => {
  const { farm, weather, scenario } = event.data;
  self.postMessage(sensitivity(farm, weather, scenario));
};
