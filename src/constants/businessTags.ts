// Preset business tags an owner can pick for their business from the profile
// screen. The 5 customer search category filters (SearchScreen) check whether
// a business's tags include one of their values — picking/removing a matching
// preset tag here immediately syncs with that search filter.
export interface BusinessTagDef {
  i18nKey: string;
  tagValue: string;
}

export const BUSINESS_TAG_DEFS: BusinessTagDef[] = [
  { i18nKey: 'businessTags.hairdresser', tagValue: 'Kuaför' },
  { i18nKey: 'businessTags.hairColor', tagValue: 'Saç Boyama' },
  { i18nKey: 'businessTags.womensCare', tagValue: 'Kadın Bakımı' },
  { i18nKey: 'businessTags.beauty', tagValue: 'Güzellik' },
  { i18nKey: 'businessTags.barber', tagValue: 'Berber' },
  { i18nKey: 'businessTags.haircut', tagValue: 'Saç Kesimi' },
  { i18nKey: 'businessTags.beard', tagValue: 'Sakal' },
  { i18nKey: 'businessTags.mensGrooming', tagValue: 'Erkek Bakımı' },
  { i18nKey: 'businessTags.spa', tagValue: 'Spa' },
  { i18nKey: 'businessTags.massage', tagValue: 'Masaj' },
  { i18nKey: 'businessTags.skinCare', tagValue: 'Cilt Bakımı' },
  { i18nKey: 'businessTags.wellness', tagValue: 'Wellness' },
  { i18nKey: 'businessTags.kidsHaircut', tagValue: 'Çocuk Kesimi' },
  { i18nKey: 'businessTags.nailArt', tagValue: 'Nail Art' },
  { i18nKey: 'businessTags.manicure', tagValue: 'Manikür' },
  { i18nKey: 'businessTags.pedicure', tagValue: 'Pedikür' },
  { i18nKey: 'businessTags.hairStyling', tagValue: 'Saç Tasarımı' },
  { i18nKey: 'businessTags.coloring', tagValue: 'Renklendirme' },
  { i18nKey: 'businessTags.care', tagValue: 'Bakım' },
  { i18nKey: 'businessTags.premiumCare', tagValue: 'Premium Bakım' },
];

export const ALLOWED_BUSINESS_TAGS = BUSINESS_TAG_DEFS.map((def) => def.tagValue);
