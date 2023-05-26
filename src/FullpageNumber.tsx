import { useContext, type FC } from "react";

import {FullpageContext} from "./FullpageContext";

export interface FullpageNumberInterface {}
export const FullpageNumber: FC<FullpageNumberInterface> = ({}) => {
  const { slideIndex } = useContext(FullpageContext);

  return <span>{`${slideIndex + 1}`}</span>;
}
