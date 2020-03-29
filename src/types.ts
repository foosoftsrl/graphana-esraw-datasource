import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  alias?: string;
  index?: string;
  query: string;
  body?: string;
  splitPath: string;
  path: string;
  x: string;
  y: string;
}

export const defaultQuery: Partial<MyQuery> = {
  index: '',
  body: '',
  query: '',
  splitPath: '',
  path: 'aggregations.range.value',
  x: 'key',
  y: 'count',
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  path?: string;
}
