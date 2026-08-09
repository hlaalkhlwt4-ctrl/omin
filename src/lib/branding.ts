import { db } from './db';

export interface PlatformBranding {
  platformName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  fontArabic: string;
  landingHeroTitle: string;
  landingHeroSub: string;
  contactEmail: string;
  supportPhone: string;
  defaultCurrency: string;
  maintenanceMode: boolean;
}

export const DEFAULT_BRANDING: PlatformBranding = {
  platformName: 'OmniFlow',
  logoUrl: '/logo.svg',
  faviconUrl: '/favicon.ico',
  primaryColor: '#0284c7',
  accentColor: '#10b981',
  fontArabic: 'Tajawal',
  landingHeroTitle: 'كل نشاطك الأونلاين في مكان واحد',
  landingHeroSub: 'منصة عربية شاملة تجمع العملاء، المحادثات، الطلبات، الأرباح، الأتمتة، ومساعد الذكاء الاصطناعي لكل نشاط تجاري.',
  contactEmail: 'support@omniflow.app',
  supportPhone: '+966500000000',
  defaultCurrency: 'SAR',
  maintenanceMode: false,
};

export async function getPlatformBranding(): Promise<PlatformBranding> {
  try {
    const settings = await db.platformSettings.findUnique({
      where: { id: 'default' },
    });
    if (!settings) return DEFAULT_BRANDING;
    return {
      platformName: settings.platformName || DEFAULT_BRANDING.platformName,
      logoUrl: settings.logoUrl || DEFAULT_BRANDING.logoUrl,
      faviconUrl: settings.faviconUrl || DEFAULT_BRANDING.faviconUrl,
      primaryColor: settings.primaryColor || DEFAULT_BRANDING.primaryColor,
      accentColor: settings.accentColor || DEFAULT_BRANDING.accentColor,
      fontArabic: settings.fontArabic || DEFAULT_BRANDING.fontArabic,
      landingHeroTitle: settings.landingHeroTitle || DEFAULT_BRANDING.landingHeroTitle,
      landingHeroSub: settings.landingHeroSub || DEFAULT_BRANDING.landingHeroSub,
      contactEmail: settings.contactEmail || DEFAULT_BRANDING.contactEmail,
      supportPhone: settings.supportPhone || DEFAULT_BRANDING.supportPhone,
      defaultCurrency: settings.defaultCurrency || DEFAULT_BRANDING.defaultCurrency,
      maintenanceMode: settings.maintenanceMode ?? false,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}
