import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reading",
}

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Blocking script to apply theme before first paint - prevents FOUC */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                // Get theme from localStorage
                const themeIndex = parseInt(localStorage.getItem('user-theme-index') || '0', 10);
                const isBlackWhite = localStorage.getItem('is-black-white') === 'true';
                
                // Theme definitions
                const themes = [
                  { colors: ['#ECEFF3', '#292B30', '#605F6F', '#A196AE', '#C4B1CE'] }, // Lavender Storm
                  { colors: ['#F0F4F8', '#1A202C', '#4A5568', '#718096', '#90CDF4'] }, // Ocean Breeze
                  { colors: ['#FFF8F0', '#2C1810', '#5C4033', '#C9A961', '#E8D5B7'] }, // Warm Sand
                  { colors: ['#BCCCC4', '#00190C', '#3D6856', '#6F9081', '#89A497'] }, // Forest Green
                  { colors: ['#080808', '#FFFFFF', '#E7E9EA', '#9CA3AF', '#6B7280'] }, // Jet Black
                ];
                
                const blackWhiteTheme = { colors: ['#FFFFFF', '#000000', '#000000', '#666666', '#000000'] };
                
                // Select theme
                let theme;
                if (isBlackWhite) {
                  theme = blackWhiteTheme;
                } else {
                  const safeIndex = (themeIndex >= 0 && themeIndex < themes.length) ? themeIndex : 0;
                  theme = themes[safeIndex];
                }
                
                // Apply theme colors immediately
                const root = document.documentElement;
                const colorVars = ['--c-canvas', '--c-ink', '--c-strong', '--c-soft', '--c-spark'];
                theme.colors.forEach((color, index) => {
                  root.style.setProperty(colorVars[index], color);
                });
                
                // Calculate additional colors
                const [canvas, ink, strong, soft] = theme.colors;
                let hover = '#44454F';
                let muted = soft;
                let light = '#E8E6F0';
                
                if (themeIndex === 4 && !isBlackWhite) {
                  hover = '#1F1F1F';
                  light = '#1F1F1F';
                } else if (themeIndex === 1) {
                  hover = '#2D3748';
                  light = '#E2E8F0';
                } else if (themeIndex === 2) {
                  hover = '#4A3728';
                  light = '#F5E6D3';
                } else if (themeIndex === 3) {
                  hover = '#2D4A3D';
                  light = '#D4E4DD';
                }
                
                root.style.setProperty('--c-hover', hover);
                root.style.setProperty('--c-muted', muted);
                root.style.setProperty('--c-light', light);
                
                // Set data attribute for Jet Black theme
                if (themeIndex === 4 && !isBlackWhite) {
                  root.setAttribute('data-theme', 'jet-black');
                } else {
                  root.removeAttribute('data-theme');
                }
              } catch (e) {
                // Silently fail - fallback to default theme
                console.debug('Theme initialization error:', e);
              }
            })();
          `,
        }}
      />
      {children}
    </>
  )
}
