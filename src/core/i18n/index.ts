import { FluxDispatcher } from "@metro/common";
import { findByNameLazy } from "@metro/wrappers";
import { PrimitiveType } from "intl-messageformat";

import langDefault from "./default.json";

const IntlMessageFormat = findByNameLazy("MessageFormat") as typeof import("intl-messageformat").default;

type I18nKey = keyof typeof langDefault;

// 直接使用默认字符串，不进行动态加载
export const Strings = langDefault as Record<I18nKey, string>;

// 保留 FluxDispatcher 订阅但不执行任何操作
export function initFetchI18nStrings() {
    const cb = () => {
        // 不执行任何操作，保持默认字符串
    };

    FluxDispatcher.subscribe("I18N_LOAD_SUCCESS", cb);
    return () => FluxDispatcher.unsubscribe("I18N_LOAD_SUCCESS", cb);
}

type FormatStringRet<T> = T extends PrimitiveType ? string : string | T | (string | T)[];

export function formatString<T = void>(key: I18nKey, val: Record<string, T>): FormatStringRet<T> {
    const str = Strings[key];
    // @ts-ignore
    return new IntlMessageFormat(str).format(val);
}
