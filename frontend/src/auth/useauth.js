import { useContext } from "react";
import { AuthCtx } from "./authCtx";

export const useAuth = () => useContext(AuthCtx);
