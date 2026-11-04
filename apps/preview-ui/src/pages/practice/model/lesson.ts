import { type ShadowingToken } from "@uni-stack/ui/components/shadowing/frame";

/** Words of the lesson and their meaning in this text */
export const MEANINGS = {
  deposit: "押金；定金",
  landlord: "房东；地主",
  tenancy: "租约；租期",
  tenant: "租客；房客"
};

/** Meaning options in a fixed order, so the right one is not always first */
export const MEANING_OPTIONS = [
  MEANINGS.tenant,
  MEANINGS.landlord,
  MEANINGS.tenancy,
  MEANINGS.deposit
];

export type Gap = {
  before: string;
  word: string;
  after: string;
  candidates: string[];
};

export const GAPS: Gap[] = [
  {
    after: "moves in on Monday.",
    before: "The new",
    candidates: ["landlord", "tenant", "tenancy", "talent"],
    word: "tenant"
  },
  {
    after: "back when you move out.",
    before: "You will get your",
    candidates: ["deposit", "despite", "tenancy", "landlord"],
    word: "deposit"
  }
];

export type RecallItem = {
  before: string;
  word: string;
  after: string;
};

export const RECALL_ITEMS: RecallItem[] = [
  { after: "fixed the heating within a day.", before: "Our", word: "landlord" },
  { after: "lasts for twelve months.", before: "The", word: "tenancy" }
];

export type Sentence = {
  tokens: ShadowingToken[];
  translation: string;
};

const words = (text: string): ShadowingToken[] =>
  text.split(" ").map((word) => {
    return { text: word };
  });

export const SENTENCES: Sentence[] = [
  {
    tokens: [
      ...words("An"),
      { text: "active", trail: "," },
      ...words("valid UK"),
      { slot: true, text: "tenancy" },
      ...words("agreement must be signed by both the"),
      { slot: true, text: "landlord" },
      ...words("and the"),
      { text: "tenant", trail: "." }
    ],
    translation: "一份有效的英国租赁协议必须由房东和租客双方签署。"
  },
  {
    tokens: [
      ...words("The"),
      { slot: true, text: "tenant" },
      ...words("pays the"),
      { slot: true, text: "deposit" },
      ...words("before moving"),
      { text: "in", trail: "." }
    ],
    translation: "租客在入住前支付押金。"
  }
];
