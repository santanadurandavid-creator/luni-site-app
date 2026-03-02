
import React, { useEffect, useRef } from 'react';

interface AdComponentProps {
  adScript: string;
}

const AdComponent: React.FC<AdComponentProps> = ({ adScript }) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (adRef.current && adScript) {
      adRef.current.innerHTML = adScript;
      const scripts = adRef.current.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    }
  }, [adScript]);

  return <div ref={adRef} className="w-full h-auto flex justify-center items-center" />;
};

export default AdComponent;
