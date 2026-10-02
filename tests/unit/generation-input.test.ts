import { expect, it } from "vitest";
import { resolveGenerationConfig } from "../../src/modules/books/generation-input";

const base = { title: "Autumn Word Search", theme: "Autumn", audience: "Adults", activityPages: 10, difficulty: "easy" as const, wordSource: "custom" };
const autumn = "autumn fall leaves leaf pumpkin pumpkins apple apples harvest acorn acorns squirrel squirrels tree trees forest woods branch branches orange yellow red brown golden crisp chilly cool breeze windy cloudy rain rainy fog foggy sweater jacket scarf boots gloves hat hoodie coat warm cozy blanket fireplace candle lantern corn cornfield maze hay hayride straw scarecrow farm farmer barn tractor field orchard basket picking cider cinnamon nutmeg spice pie cobbler muffin bread soup stew cocoa tea mug maple oak pine chestnut walnut pecan seed seeds pinecone pinecones mushroom mushrooms moss grass garden sunflower sunflowers chrysanthemum flowers berries cranberry cranberries grape grapes pear pears squash gourds gourd carrot carrots potato potatoes turnip cabbage broccoli vegetable vegetables fruit fruits turkey feast dinner family thankful gratitude grateful thankful together gathering celebration tradition picnic camping hiking trail mountain hills valley river lake pond stream nature outdoors wildlife deer fox rabbit owl crow raven bird birds migration geese duck ducks nest feather feathers woodland squirrel chipmunk hedgehog raccoon bear foxes moon sunset sunrise sky clouds stars evening morning afternoon season seasonal September October November weekend school classroom teacher student notebook pencil backpack reading writing puzzle puzzles game games search hidden letters words vocabulary spelling learning activity fun playful adventure explore discover colorful crunchy rustling falling drifting changing season weather cooler frosty frost morning daylight sunset bonfire campfire marshmallow roasted picnic festival fair market pumpkinpatch applepicking leafpile jumping walking hiking baking cooking decorating gathering carving painting crafting familytime friendship kindness sharing thankful happiness laughter memories autumnal falltime".split(" ");

it("accepts the supplied 250-entry numbered autumn list and removes duplicates", () => {
  expect(autumn).toHaveLength(250);
  const customWords = autumn.map((word, i) => `${i + 1}. ${word}`).join("\r\n");
  const result = resolveGenerationConfig({ ...base, customWords });
  expect(result.words).toEqual([...new Set(autumn.map(word => word.toUpperCase()))]);
  expect(result.wordSource).toBe("custom");
});

it.each(["numbered", "parentheses", "bullet", "dash", "asterisk", "commas", "semicolons"])("accepts %s lists", format => {
  const words = autumn.slice(0, 24);
  const customWords = words.map((word, i) => ({ numbered: `${i + 1}) ${word}`, parentheses: `(${i + 1}) ${word}`, bullet: `\u2022 ${word}`, dash: `- ${word}`, asterisk: `* ${word}`, commas: word, semicolons: word })[format]!).join(format === "commas" ? "," : format === "semicolons" ? ";" : "\n");
  expect(resolveGenerationConfig({ ...base, customWords }).words).toEqual(words.map(word => word.toUpperCase()));
});

it.each(["fall2", "apple!", "ab", "abcdefghijklmnop"])("still rejects invalid words such as %s and identifies them", word => {
  expect(() => resolveGenerationConfig({ ...base, customWords: [...autumn.slice(0, 24), `25. ${word}`].join("\n") })).toThrow(`Invalid word: "${word}"`);
});

it("still requires 24 distinct words after removing list markers", () => {
  expect(() => resolveGenerationConfig({ ...base, customWords: Array.from({ length: 24 }, (_, i) => `${i + 1}. autumn`).join("\n") })).toThrow("at least 24");
});

it.each(["&#x20;", "&#32;", "&nbsp;", "&#160;", "&#xA0;"])("accepts pasted HTML spaces (%s) before splitting semicolon lists", entity => {
  const words = autumn.slice(0, 24);
  expect(resolveGenerationConfig({ ...base, customWords: words.map(word => `${word}${entity}`).join(";") }).words).toEqual(words.map(word => word.toUpperCase()));
});
