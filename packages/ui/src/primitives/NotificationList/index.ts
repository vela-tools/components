import { Empty, Error, Item, Items, Status, Table } from "./parts";

export const NotificationList = {
    Table,
    Items,
    Item,
    Status,
    Empty,
    Error,
};

export type NotificationListParts = typeof NotificationList;

export { NotificationListProvider, useNotificationListContext } from "./NotificationList.context";
export type { NotificationListContextValue } from "./NotificationList.context";
export type {
    NotificationListColumn,
    NotificationListItemProps,
    NotificationListItemsProps,
    NotificationListPartProps,
    NotificationListTableProps,
} from "./parts";
