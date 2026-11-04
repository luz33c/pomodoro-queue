import { ENV_WEB_ISOMORPHIC } from "@uni-stack/env/web/env.isomorphic";
import { type WrapperImageProps } from "@uni-stack/ui/components/image";
import { Image as RawImage } from "@uni-stack/ui/components/image";

export function Image(props: WrapperImageProps) {
  return (
    <RawImage
      {...props}
      siteBaseUrl={ENV_WEB_ISOMORPHIC.VITE_WEB_URL}
      imgProxyBaseUrl={ENV_WEB_ISOMORPHIC.VITE_IMGPROXY_URL}
      imgProxySignature={ENV_WEB_ISOMORPHIC.VITE_IMGPROXY_SIGNATURE}
    />
  );
}
