import { useMemo, useState } from "react";
import clsx from "clsx";
import { Badge, Box, Group, Skeleton, Text, TextInput, UnstyledButton } from "@mantine/core";
import { CheckSquareIcon, MagnifyingGlassIcon, SquareIcon } from "@phosphor-icons/react";
import { allTypesSelected, filterTypes, toggleTypeKey, totalCount } from "../queryBuilder.utils";
import { useQueryBuilderContext } from "../QueryBuilder.context";
import classes from "./QueryBuilder.module.css";
import type { PartProps } from "./types";
import { PartLock } from "./PartLock";

export function EntityTypes({ className, style }: PartProps) {
    const { types, typesLoading: loading, draft, setDraft } = useQueryBuilderContext("EntityTypes");
    const [search, setSearch] = useState("");

    const { typeKeys } = draft;
    const visible = useMemo(() => filterTypes(types, search), [types, search]);
    const allSelected = allTypesSelected(types, typeKeys);
    const total = totalCount(types);
    const setTypeKeys = (next: string[]) => setDraft({ ...draft, typeKeys: next });

    return (
        <PartLock part="types">
            <Box className={clsx(classes.types, className)} style={style}>
                <Group justify="space-between" style={{ padding: "8px 12px 6px" }}>
                    <Text className={classes.sectionHeader}>Entity types</Text>
                    <Group gap={4}>
                        {total !== undefined && (
                            <Badge size="xs" variant="light" color="gray" style={{ fontWeight: 400, fontSize: 10 }}>
                                {total} total
                            </Badge>
                        )}
                        <UnstyledButton
                            aria-label={allSelected ? "Clear selection" : "Select all types"}
                            disabled={loading || types.length === 0}
                            onClick={() => setTypeKeys(allSelected ? [] : types.map((t) => t.key))}
                            style={{ display: "flex", alignItems: "center", color: "var(--vela-accent)" }}
                        >
                            {allSelected ? <CheckSquareIcon size={13} weight="fill" /> : <SquareIcon size={13} />}
                        </UnstyledButton>
                    </Group>
                </Group>

                <Box style={{ padding: "0 12px 6px" }}>
                    <TextInput
                        placeholder="Search types…"
                        aria-label="Search types"
                        size="xs"
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        leftSection={<MagnifyingGlassIcon size={11} />}
                        styles={{ input: { fontSize: 11, height: 26 } }}
                    />
                </Box>

                <Box className={`${classes.typeList} vela-thin-scroll`}>
                    {loading
                        ? Array.from({ length: 5 }, (_, i) => (
                              <Skeleton key={i} height={30} mx={12} mb={4} radius="sm" />
                          ))
                        : visible.map((type) => {
                              const selected = typeKeys.includes(type.key);
                              return (
                                  <UnstyledButton
                                      key={type.key}
                                      className={classes.typeRow}
                                      data-selected={selected}
                                      aria-pressed={selected}
                                      onClick={() => setTypeKeys(toggleTypeKey(typeKeys, type.key))}
                                  >
                                      <Box className={classes.typeDot} style={{ background: type.color }} />
                                      <Text
                                          className={classes.typeLabel}
                                          c={selected ? "var(--vela-accent)" : "var(--vela-color-text)"}
                                          fw={selected ? 600 : 400}
                                      >
                                          {type.label}
                                      </Text>
                                      {type.count !== undefined && (
                                          <Badge
                                              size="xs"
                                              variant={selected ? "filled" : "light"}
                                              color={selected ? "violet" : "gray"}
                                              style={{ fontSize: 10, fontWeight: 500, flexShrink: 0 }}
                                          >
                                              {type.count}
                                          </Badge>
                                      )}
                                      <SquareIcon
                                          size={12}
                                          weight={selected ? "fill" : "regular"}
                                          color={selected ? "var(--vela-accent)" : "var(--vela-color-text4)"}
                                          style={{ flexShrink: 0 }}
                                      />
                                  </UnstyledButton>
                              );
                          })}
                </Box>
            </Box>
        </PartLock>
    );
}
