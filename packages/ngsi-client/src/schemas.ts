import { z } from "zod";
import { geoQuerySchema } from "./geo";

const temporal = {
    observedAt: z.string().optional(),
    createdAt: z.string().optional(),
    modifiedAt: z.string().optional(),
};

const position = z.array(z.number()).min(2);
const geometry = z.discriminatedUnion("type", [
    z.object({ type: z.literal("Point"), coordinates: position }),
    z.object({ type: z.literal("MultiPoint"), coordinates: z.array(position) }),
    z.object({ type: z.literal("LineString"), coordinates: z.array(position).min(2) }),
    z.object({ type: z.literal("MultiLineString"), coordinates: z.array(z.array(position)) }),
    z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(position)) }),
    z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(z.array(position))) }),
]);

const KNOWN = ["Property", "GeoProperty", "Relationship"] as const;

const property = z.looseObject({
    type: z.literal("Property"),
    value: z.unknown().refine((v) => v !== undefined, "Property without value"),
    ...temporal,
    unitCode: z.string().optional(),
});
const geoProperty = z.looseObject({ type: z.literal("GeoProperty"), value: geometry, ...temporal });
const relationship = z.looseObject({
    type: z.literal("Relationship"),
    object: z.union([z.string(), z.array(z.string())]),
    objectType: z.unknown().optional(),
    ...temporal,
});
const otherAttribute = z.looseObject({ type: z.string().refine((t) => !(KNOWN as readonly string[]).includes(t)) });

const attribute = z.union([property, geoProperty, relationship, otherAttribute]);
const attributeOrInstances = z.union([attribute, z.array(attribute).min(1)]);

export const entitySchema = z
    .looseObject({ id: z.string().min(1), type: z.string().min(1) })
    .superRefine((entity, ctx) => {
        for (const [key, value] of Object.entries(entity)) {
            if (key === "id" || key === "type" || key === "@context") continue;
            const r = attributeOrInstances.safeParse(value);
            if (!r.success) ctx.addIssue({ code: "custom", path: [key], message: `invalid attribute "${key}"` });
        }
    });

const oneOrMany = <T extends z.ZodType>(item: T) => z.union([z.array(item), item.transform((value) => [value])]);

export const typeListSchema = z.union([
    z.looseObject({ typeList: oneOrMany(z.string()) }).transform((r) => r.typeList),
    z
        .union([
            z.null(),
            z.literal(""),
            z.strictObject({}),
            z.looseObject({ type: z.literal("EntityTypeList"), typeList: z.undefined().optional() }),
        ])
        .transform((): string[] => []),
    z.looseObject({ types: oneOrMany(z.string()) }).transform((r) => r.types),
    z.looseObject({ typeName: z.string() }).transform((t) => [t.typeName]),
    z.array(z.union([z.string(), z.looseObject({ typeName: z.string() }).transform((t) => t.typeName)])),
]);

export const typeDetailsSchema = oneOrMany(
    z.looseObject({ typeName: z.string(), attributeNames: oneOrMany(z.string()).default([]) }),
);

export const typeInfoSchema = z.looseObject({
    typeName: z.string(),
    entityCount: z.number().optional(),
    attributeDetails: oneOrMany(
        z.looseObject({ attributeName: z.string(), attributeTypes: oneOrMany(z.string()).optional() }),
    ).default([]),
});

export const notificationSchema = z.looseObject({
    format: z.string().optional(),
    attributes: oneOrMany(z.string()).optional(),
    pick: oneOrMany(z.string()).optional(),
    omit: oneOrMany(z.string()).optional(),
    showChanges: z.boolean().optional(),
    sysAttrs: z.boolean().optional(),
    join: z.string().optional(),
    joinLevel: z.number().optional(),
    endpoint: z.looseObject({ uri: z.string(), accept: z.string().optional() }).optional(),
    status: z.string().optional(),
    timesSent: z.number().optional(),
    timesFailed: z.number().optional(),
    lastNotification: z.string().optional(),
    lastSuccess: z.string().optional(),
    lastFailure: z.string().optional(),
});

export const subscriptionSchema = z.looseObject({
    id: z.string().min(1),
    subscriptionName: z.string().optional(),
    description: z.string().optional(),
    entities: oneOrMany(
        z.looseObject({ type: z.string().optional(), id: z.string().optional(), idPattern: z.string().optional() }),
    ).optional(),
    watchedAttributes: oneOrMany(z.string()).optional(),
    notificationTrigger: oneOrMany(z.string()).optional(),
    q: z.string().optional(),
    geoQ: geoQuerySchema.optional(),
    scopeQ: z.string().optional(),
    throttling: z.number().optional(),
    timeInterval: z.number().optional(),
    expiresAt: z.string().optional(),
    lang: z.string().optional(),
    jsonldContext: z.string().optional(),
    expandValues: oneOrMany(z.string()).optional(),
    jsonKeys: oneOrMany(z.string()).optional(),
    isActive: z.boolean().optional(),
    status: z.string().optional(),
    notification: notificationSchema.optional(),
});

export function reasonOf(error: z.ZodError): string {
    return error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
}
