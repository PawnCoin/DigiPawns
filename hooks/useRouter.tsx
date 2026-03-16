import { useState, useEffect } from 'react';

const useRouter = () => {
  const [route, setRoute] = useState(window.location.pathname);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);

    // Intercept clicks on local links
    const handleLinkClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const anchor = target.closest('a');
        if (anchor && anchor.target !== '_blank' && anchor.origin === window.location.origin) {
            const href = anchor.getAttribute('href');
            if (href && !href.startsWith('#')) {
                 event.preventDefault();
                 navigate(href);
            }
        }
    };
    
    document.addEventListener('click', handleLinkClick);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleLinkClick);
    };
  }, []);

  return { route, navigate };
};

export default useRouter;
