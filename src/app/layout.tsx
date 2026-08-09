import './globals.css';
import { getPlatformBranding } from '@/lib/branding';

export async function generateMetadata() {
  const branding = await getPlatformBranding();
  return {
    title: `${branding.platformName} - المنصة العربية الشاملة لإدارة الأعمال والعملاء`,
    description: branding.landingHeroSub,
    icons: {
      icon: branding.faviconUrl,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await getPlatformBranding();

  const dynamicStyles = `
    :root {
      --color-brand-500: ${branding.primaryColor};
      --color-accent-500: ${branding.accentColor};
      --font-arabic: '${branding.fontArabic}', sans-serif;
    }
  `;

  return (
    <html lang="ar" dir="rtl" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(
            branding.fontArabic
          )}:wght@300;400;500;600;700;800&display=swap`}
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      </head>
      <body className="h-full antialiased font-arabic flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
