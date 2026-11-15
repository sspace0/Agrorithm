import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ScientificText from "../src/components/ScientificText";

it("renders scientific exponents and braced subscripts", () => {
  const html = renderToStaticMarkup(<ScientificText>{"m^2 · m^{3} · ET_{0} · CO_{2} · m^-2"}</ScientificText>);
  expect(html).toBe("m<sup>2</sup> · m<sup>3</sup> · ET<sub>0</sub> · CO<sub>2</sub> · m<sup>-2</sup>");
});
it("keeps provider identifiers, prose and escaped HTML literal", () => {
  const html = renderToStaticMarkup(<ScientificText>{"T2M_MIN <img> existing m³"}</ScientificText>);
  expect(html).toBe("T2M_MIN &lt;img&gt; existing m³");
});
it("formats named temperature subscripts without changing NASA parameter codes", () => {
  expect(renderToStaticMarkup(<ScientificText>{"Tmax / Tmin / Tmean · ET0 · Kc · T2M_MAX"}</ScientificText>)).toBe("T<sub>max</sub> / T<sub>min</sub> / T<sub>mean</sub> · ET<sub>0</sub> · K<sub>c</sub> · T2M_MAX");
});
