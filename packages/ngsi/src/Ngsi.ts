import {
    BrokerConfig,
    ConnectionStatusCard,
    EntityDetailsTable,
    EntityTable,
    ItemPicker,
    NotificationList,
    QueryBuilder,
    SubscriptionEditor,
    SubscriptionList,
    type BrokerConfigParts,
    type ConnectionStatusParts,
    type EntityDetailsParts,
    type EntityTableParts,
    type ItemPickerParts,
    type NotificationListParts,
    type QueryBuilderParts,
    type SubscriptionEditorParts,
    type SubscriptionListParts,
} from "@vela-tools/ui";
import {
    AttributeListRoot,
    BrokerConfigRoot,
    ConnectionStatusRoot,
    EntityDetailsRoot,
    EntityListRoot,
    EntityTableRoot,
    NotificationListRoot,
    QueryBuilderRoot,
    SubscriptionEditorRoot,
    SubscriptionListRoot,
    TypeListRoot,
} from "./bound";
import { If } from "./runtime/If";

export interface SubscriptionEditorFamily extends SubscriptionEditorParts {
    Root: typeof SubscriptionEditorRoot;
}

export interface SubscriptionListFamily extends SubscriptionListParts {
    Root: typeof SubscriptionListRoot;
}

export interface NotificationListFamily extends NotificationListParts {
    Root: typeof NotificationListRoot;
}

export interface QueryBuilderFamily extends QueryBuilderParts {
    Root: typeof QueryBuilderRoot;
}

export interface EntityTableFamily extends EntityTableParts {
    Root: typeof EntityTableRoot;
}

export interface EntityDetailsFamily extends EntityDetailsParts {
    Root: typeof EntityDetailsRoot;
}

export interface BrokerConfigFamily extends BrokerConfigParts {
    Root: typeof BrokerConfigRoot;
}

export interface ConnectionStatusFamily extends ConnectionStatusParts {
    Root: typeof ConnectionStatusRoot;
}

export interface TypeListFamily extends ItemPickerParts {
    Root: typeof TypeListRoot;
}

export interface EntityListFamily extends ItemPickerParts {
    Root: typeof EntityListRoot;
}

export interface AttributeListFamily extends ItemPickerParts {
    Root: typeof AttributeListRoot;
}

const TypeListFamily: TypeListFamily = { ...ItemPicker, Root: TypeListRoot };
const EntityListFamily: EntityListFamily = { ...ItemPicker, Root: EntityListRoot };
const AttributeListFamily: AttributeListFamily = { ...ItemPicker, Root: AttributeListRoot };
const EntityTableFamily: EntityTableFamily = { ...EntityTable, Root: EntityTableRoot };
const EntityDetailsFamily: EntityDetailsFamily = { ...EntityDetailsTable, Root: EntityDetailsRoot };
const BrokerConfigFamily: BrokerConfigFamily = { ...BrokerConfig, Root: BrokerConfigRoot };
const ConnectionStatusFamily: ConnectionStatusFamily = { ...ConnectionStatusCard, Root: ConnectionStatusRoot };
const SubscriptionEditorFamily: SubscriptionEditorFamily = { ...SubscriptionEditor, Root: SubscriptionEditorRoot };
const SubscriptionListFamily: SubscriptionListFamily = { ...SubscriptionList, Root: SubscriptionListRoot };
const NotificationListFamily: NotificationListFamily = { ...NotificationList, Root: NotificationListRoot };
const QueryBuilderFamily: QueryBuilderFamily = { ...QueryBuilder, Root: QueryBuilderRoot };

export const Ngsi = {
    TypeList: TypeListFamily,
    EntityList: EntityListFamily,
    AttributeList: AttributeListFamily,
    EntityTable: EntityTableFamily,
    EntityDetails: EntityDetailsFamily,
    ConnectionStatus: ConnectionStatusFamily,
    BrokerConfig: BrokerConfigFamily,
    If,
    SubscriptionEditor: SubscriptionEditorFamily,
    SubscriptionList: SubscriptionListFamily,
    NotificationList: NotificationListFamily,
    QueryBuilder: QueryBuilderFamily,
};
