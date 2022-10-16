import { MODULENAME } from "../../xdy-pf2e-workbench";
import { TokenDocumentPF2e } from "@scene";
import { AON_CREATURE_TYPES, ELITE_WEAK } from "../../xdy-pf2e-constants";
import { TokenPF2e } from "@module/canvas";

let TRAITS: {
    SIZES: string[];
    RARITIES: string[];
    PF2E_CREATURE_TRAITS: string[];
    AON_CREATURE_TYPES: string[];
    ELITE_WEAK: string[];
    ALIGNMENTS: string[];
};

function fillTraits() {
    TRAITS = {
        RARITIES: Object.keys(CONFIG.PF2E.rarityTraits),
        SIZES: Object.keys(CONFIG.PF2E.actorSizes),
        AON_CREATURE_TYPES: AON_CREATURE_TYPES,
        PF2E_CREATURE_TRAITS: Object.keys(CONFIG.PF2E.creatureTraits),
        ELITE_WEAK: ELITE_WEAK,
        ALIGNMENTS: Object.keys(CONFIG.PF2E.alignmentTraits),
    };
}

function filterTraitList(traitsList: string[]): string[] {
    if (game.settings.get(MODULENAME, "npcMystifierBlacklist")) {
        const blocklist =
            (<string>game.settings.get(MODULENAME, "npcMystifierBlacklist")).toLocaleLowerCase().split(",") || null;
        if (blocklist) {
            traitsList = traitsList.filter((trait: string) => {
                return !blocklist.map((trait: string) => trait.trim()).includes(trait);
            });
        }
    }

    let size: string[] = [];
    if (game.settings.get(MODULENAME, "npcMystifierUseSize")) {
        size = traitsList.filter((trait: string) => TRAITS.SIZES.includes(trait));
    }

    let eliteWeak: string[] = [];
    if (game.settings.get(MODULENAME, "npcMystifierUseEliteWeak")) {
        eliteWeak = traitsList.filter((trait: string) => TRAITS.ELITE_WEAK.includes(trait));
    }

    let rarities: string[] = [];
    if (game.settings.get(MODULENAME, "npcMystifierUseRarities")) {
        rarities = traitsList.filter((trait: string) => TRAITS.RARITIES.includes(trait));
        const replacement: string = (<string>(
            game.settings.get(MODULENAME, "npcMystifierUseRaritiesReplacement")
        )).toLocaleLowerCase();
        if (replacement !== "") {
            rarities = rarities.map((trait: string) => (trait !== "common" ? replacement : trait));
        }
    }

    let aonCreatureTypes: string[] = [];
    if (game.settings.get(MODULENAME, "npcMystifierUseCreatureTypesTraits")) {
        aonCreatureTypes = traitsList.filter((trait: string) => TRAITS.AON_CREATURE_TYPES.includes(trait));
    }

    let pf2eCreatureTraits: string[] = [];
    if (game.settings.get(MODULENAME, "npcMystifierUseCreatureTraits")) {
        pf2eCreatureTraits = traitsList.filter((trait: string) => TRAITS.PF2E_CREATURE_TRAITS.includes(trait));
    }

    let alignments: string[] = [];
    if (game.settings.get(MODULENAME, "npcMystifierUseAlignmentTraits")) {
        alignments = traitsList.filter((trait: string) => TRAITS.ALIGNMENTS.includes(trait));
    }

    let others: string[] = [];
    if (game.settings.get(MODULENAME, "npcMystifierUseOtherTraits")) {
        others = traitsList
            .filter((trait: string) => !TRAITS.ELITE_WEAK.includes(trait))
            .filter((trait: string) => !TRAITS.SIZES.includes(trait))
            .filter((trait: string) => !TRAITS.RARITIES.includes(trait))
            .filter((trait: string) => !TRAITS.AON_CREATURE_TYPES.includes(trait))
            .filter((trait: string) => !TRAITS.PF2E_CREATURE_TRAITS.includes(trait))
            .filter((trait: string) => !TRAITS.ALIGNMENTS.includes(trait));
    }

    const prefix = <string>(game.settings.get(MODULENAME, "npcMystifierPrefix") ?? "");
    const postfix = <string>(game.settings.get(MODULENAME, "npcMystifierPostfix") ?? "");

    // Deduplicate using set
    return Array.from(
        new Set(
            [prefix]
                .concat(size)
                .concat(eliteWeak)
                .concat(alignments)
                .concat(rarities)
                .concat(others)
                .concat(aonCreatureTypes)
                .concat(pf2eCreatureTraits)
                .concat([postfix])
        ).values()
    );
}

export async function generateNameFromTraitsForToken(tokenId: string) {
    const token = <TokenPF2e>(<unknown>game.scenes?.current?.tokens?.get(tokenId));
    if (token) {
        return generateNameFromTraits(token);
    }
}

export async function generateNameFromTraits(token: TokenPF2e | TokenDocumentPF2e) {
    let result: any;
    const data = token?.actor?.system;
    const traits = data?.traits;
    const customTraits: any = traits?.traits?.custom;
    if (!TRAITS) {
        fillTraits();
    }

    if (traits) {
        let traitsList = <string[]>traits["value"];
        if (traitsList) {
            if (customTraits) {
                traitsList = traitsList.concat(customTraits.trim().split(","));
            }
            const tokenRarities: any = traits.rarity;
            if (tokenRarities) {
                traitsList = traitsList.concat(tokenRarities);
            }

            const size = traits?.size?.value;
            if (size) {
                traitsList.push(size);
            }

            traitsList = filterTraitList(traitsList);

            result = traitsList
                .map((trait: string) => trait.trim())
                .filter((trait: string, index: number) => {
                    return traitsList.indexOf(trait) === index;
                })
                .filter((trait) => trait.trim().length > 0)
                .map((trait: string) => {
                    return trait?.charAt(0).toLocaleUpperCase() + trait?.slice(1);
                })
                .map((trait: string) => {
                    const lowercaseTrait = trait.toLocaleLowerCase();
                    if (TRAITS.ELITE_WEAK.includes(lowercaseTrait)) {
                        switch (lowercaseTrait) {
                            case TRAITS.ELITE_WEAK[0]:
                                return game.i18n.localize("PF2E.NPC.Adjustment.EliteLabel");
                            case TRAITS.ELITE_WEAK[1]:
                                return game.i18n.localize("PF2E.NPC.Adjustment.WeakLabel");
                        }
                    } else if (TRAITS.SIZES.includes(lowercaseTrait)) {
                        return game.i18n.localize(CONFIG.PF2E.actorSizes[lowercaseTrait]);
                    }

                    const translations: any = game.i18n.translations.PF2E ?? {};
                    return translations[`Trait${trait}`] ?? trait;
                })
                .join(" ");
        }
    } else {
        // Shouldn't happen. But, just in case...
        result = <string>game.settings.get(MODULENAME, "npcMystifierNoMatch");
    }
    return result;
}
