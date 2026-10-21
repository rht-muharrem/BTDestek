import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { brandingApi } from './api';
import { BrandSettings } from './types';

const DEFAULT_BRANDING: BrandSettings = { companyName: 'Destek Masası', logoDataUrl: null };

interface BrandingContextValue {
  branding: BrandSettings;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  refreshBranding: async () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandSettings>(DEFAULT_BRANDING);

  async function load() {
    try {
      const data = await brandingApi.get();
      setBranding(data);
      // Tarayıcı sekme ikonunu (favicon) da güncelle, logo yüklendiyse
      if (data.logoDataUrl) {
        const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (link) link.href = data.logoDataUrl;
      }
      document.title = data.companyName;
    } catch {
      // Backend'e henüz ulaşılamıyorsa varsayılan marka ile devam et — uygulamayı bozma.
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding: load }}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
