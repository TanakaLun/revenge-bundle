import { Strings } from "@core/i18n";
import AddonPage from "@core/ui/components/AddonPage";
import PluginCard from "@core/ui/settings/pages/Plugins/components/PluginCard";
import { VdPluginManager } from "@core/vendetta/plugins";
import { useProxy } from "@core/vendetta/storage";
import { isCorePlugin, isPluginInstalled, pluginSettings, registeredPlugins } from "@lib/addons/plugins";
import { Author } from "@lib/addons/types";
import { findAssetId } from "@lib/api/assets";
import { settings } from "@lib/api/settings";
import { useObservable } from "@lib/api/storage";
import { showToast } from "@lib/ui/toasts";
import { BUNNY_PROXY_PREFIX, VD_PROXY_PREFIX } from "@lib/utils/constants";
import { lazyDestructure } from "@lib/utils/lazy";
import { findByProps } from "@metro";
import { NavigationNative } from "@metro/common";
import { Button, Card, FlashList, IconButton, Text } from "@metro/common/components";
import { ComponentProps } from "react";
import { View } from "react-native";

import { UnifiedPluginModel } from "./models";
import unifyBunnyPlugin from "./models/bunny";
import unifyVdPlugin from "./models/vendetta";

const { openAlert } = lazyDestructure(() => findByProps("openAlert", "dismissAlert"));
const { AlertModal, AlertActions, AlertActionButton } = lazyDestructure(() => findByProps("AlertModal", "AlertActions"));

interface PluginPageProps extends Partial<ComponentProps<typeof AddonPage<UnifiedPluginModel>>> {
    useItems: () => unknown[];
}

function PluginPage(props: PluginPageProps) {
    const items = props.useItems();

    return <AddonPage<UnifiedPluginModel>
        CardComponent={PluginCard}
        title={Strings.PLUGINS}
        searchKeywords={[
            "name",
            "description",
            p => p.authors?.map(
                (a: Author | string) => typeof a === "string" ? a : a.name
            ).join() || ""
        ]}
        sortOptions={{
            "名称 (A-Z)": (a, b) => a.name.localeCompare(b.name),
            "名称 (Z-A)": (a, b) => b.name.localeCompare(a.name),
            "已启用": (a, b) => Number(b.isEnabled()) - Number(a.isEnabled()),
            "已禁用": (a, b) => Number(a.isEnabled()) - Number(b.isEnabled())

        }}
        safeModeHint={{ message: Strings.SAFE_MODE_NOTICE_PLUGINS }}
        items={items}
        {...props}
    />;
}

export default function Plugins() {
    useProxy(settings);
    const navigation = NavigationNative.useNavigation();

    return <PluginPage
        useItems={() => {
            useProxy(VdPluginManager.plugins);
            useObservable([pluginSettings]);

            const vdPlugins = Object.values(VdPluginManager.plugins).map(unifyVdPlugin);
            const bnPlugins = [...registeredPlugins.values()].filter(p => isPluginInstalled(p.id) && !isCorePlugin(p.id)).map(unifyBunnyPlugin);

            return [...vdPlugins, ...bnPlugins];
        }}
        ListHeaderComponent={() => {
            const unproxiedPlugins = Object.values(VdPluginManager.plugins).filter(p => !p.id.startsWith(VD_PROXY_PREFIX) && !p.id.startsWith(BUNNY_PROXY_PREFIX));
            if (!unproxiedPlugins.length) return null;

            return <View style={{ marginVertical: 12, marginHorizontal: 10 }}>
                <Card border="strong">
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
                        <View style={{ gap: 6, flexShrink: 1 }}>
                            <Text variant="heading-md/bold">发现未代理的插件</Text>
                            <Text variant="text-sm/medium" color="text-muted">
                                从未代理来源安装的插件可能在您不知情的情况下在此应用中运行未经验证的代码
                            </Text>
                        </View>
                        <View style={{ marginLeft: "auto" }}>
                            <IconButton
                                size="sm"
                                variant="secondary"
                                icon={findAssetId("CircleInformationIcon-primary")}
                                style={{ marginLeft: 8 }}
                                onPress={() => {
                                    navigation.push("BUNNY_CUSTOM_PAGE", {
                                        title: "未代理的插件",
                                        render: () => {
                                            return <FlashList
                                                data={unproxiedPlugins}
                                                contentContainerStyle={{ padding: 8 }}
                                                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                                                renderItem={({ item: p }: any) => <Card>
                                                    <Text variant="heading-md/semibold">{p.id}</Text>
                                                </Card>}
                                            />;
                                        }
                                    });
                                }}
                            />
                        </View>
                    </View>
                </Card>
            </View>;
        }}
        ListFooterComponent={() => __DEV__ && (
            <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 16, gap: 12 }}><Button
                size="lg"
                text="浏览插件"
                icon={findAssetId("CompassIcon")}
                onPress={() => {
                    navigation.push("BUNNY_CUSTOM_PAGE", {
                        title: "插件浏览器",
                        render: React.lazy(() => import("../PluginBrowser")),
                    });
                }}
            />
            </View>
        )}
        installAction={{
            label: "安装插件",
            fetchFn: async (url: string) => {
                if (!url.startsWith(VD_PROXY_PREFIX) && !url.startsWith(BUNNY_PROXY_PREFIX) && !settings.developerSettings) {
                    openAlert("bunny-plugin-unproxied-confirmation", <AlertModal
                        title="请稍等！"
                        content="您正在尝试从非代理的外部来源安装插件。这意味着您信任创建者在此应用中运行他们的代码而您不知情。您确定要继续吗？"
                        extraContent={<Card><Text variant="text-md/bold">{url}</Text></Card>}
                        actions={<AlertActions>
                            <AlertActionButton text="继续" variant="primary" onPress={() => {
                                VdPluginManager.installPlugin(url)
                                    .then(() => showToast(Strings.TOASTS_INSTALLED_PLUGIN, findAssetId("DownloadIcon")))
                                    .catch(e => openAlert("bunny-plugin-install-failed", <AlertModal
                                        title="安装失败"
                                        content={`无法从 '${url}' 安装插件：`}
                                        extraContent={<Card><Text variant="text-md/normal">{e instanceof Error ? e.message : String(e)}</Text></Card>}
                                        actions={<AlertActionButton text="确定" variant="primary" />}
                                    />));
                            }} />
                            <AlertActionButton text="取消" variant="secondary" />
                        </AlertActions>}
                    />);
                } else {
                    return await VdPluginManager.installPlugin(url);
                }
            }
        }}
    />;
}