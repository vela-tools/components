export type QueryBuilderType = {
    key: string;
    label: string;
    count?: number;
    color?: string;
    properties: string[];
};

export type QueryBuilderCondition = {
    id: string;
    property: string;
    operator: string;
    value: string;
};

export type QueryBuilderGeo = {
    label?: string;
    lat: number;
    lon: number;
    radiusKm: number;
};

export type QueryBuilderDraft = {
    typeKeys: string[];
    mode: "builder" | "text";
    conditions: QueryBuilderCondition[];
    text: string;
    geo: QueryBuilderGeo | null;
};

export type QueryBuilderSavedItem = {
    id: string;
    name: string;
    createdAt: string;
    description?: string;
};

export type QueryBuilderOperator = { value: string; label: string };
