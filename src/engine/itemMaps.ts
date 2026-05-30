import rings from "../data/rings.json";
import charms from "../data/charms.json";
import necklaces from "../data/necklaces.json";
import pans from "../data/pans.json";
import shovels from "../data/shovels.json";

export const ringMap = new Map(rings.map((item) => [item.id, item]));

export const charmMap = new Map(charms.map((item) => [item.id, item]));

export const necklaceMap = new Map(necklaces.map((item) => [item.id, item]));

export const panMap = new Map(pans.map((item) => [item.id, item]));

export const shovelMap = new Map(shovels.map((item) => [item.id, item]));
