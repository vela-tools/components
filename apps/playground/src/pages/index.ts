import type { ComponentType } from "react";
import { AppFramePage } from "./AppFrame";
import { BrokerConnectorPage } from "./BrokerConnector";
import { BrokerStatusPage } from "./BrokerStatus";
import { EntityBrowserPage } from "./EntityBrowser";
import { EntityPickerPage } from "./EntityPicker";
import { PickersPage } from "./Pickers";
import { QueryBuilderPage } from "./QueryBuilder";
import { SubscriptionsPage } from "./Subscriptions";

export type PlaygroundPage = {
    id: string;
    label: string;
    component: ComponentType;
};

export const PAGES: PlaygroundPage[] = [
    { id: "subscriptions", label: "Subscriptions", component: SubscriptionsPage },
    { id: "pickers", label: "Pickers", component: PickersPage },
    { id: "entity-picker", label: "EntityPicker", component: EntityPickerPage },
    { id: "entity-browser", label: "EntityBrowser", component: EntityBrowserPage },
    { id: "query-builder", label: "QueryBuilder", component: QueryBuilderPage },
    { id: "broker-status", label: "BrokerStatus", component: BrokerStatusPage },
    { id: "broker-connector", label: "BrokerConnector", component: BrokerConnectorPage },
    { id: "app-frame", label: "AppFrame", component: AppFramePage },
];
