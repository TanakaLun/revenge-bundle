import { Strings } from "@core/i18n";
import AddonPage from "@core/ui/components/AddonPage";
import FontEditor from "@core/ui/settings/pages/Fonts/FontEditor";
import { useProxy } from "@core/vendetta/storage";
import { FontDefinition, fonts } from "@lib/addons/fonts";
import { settings } from "@lib/api/settings";
import { NavigationNative } from "@metro/common";

import FontCard from "./FontCard";

export default function Fonts() {
    useProxy(settings);
    useProxy(fonts);

    const navigation = NavigationNative.useNavigation();

    return (
        <AddonPage<FontDefinition>
            title={Strings.FONTS}
            searchKeywords={["name", "description"]}
            sortOptions={{
                "名称 (A-Z)": (a, b) => a.name.localeCompare(b.name),
                "名称 (Z-A)": (a, b) => b.name.localeCompare(a.name)
            }}
            items={Object.values(fonts)}
            safeModeHint={{ message: Strings.SAFE_MODE_NOTICE_FONTS }}
            CardComponent={FontCard}
            installAction={{
                label: "安装字体",
                onPress: () => {
                    navigation.push("BUNNY_CUSTOM_PAGE", {
                        title: "导入字体",
                        render: () => <FontEditor />
                    });
                }
            }}
        />
    );
}
