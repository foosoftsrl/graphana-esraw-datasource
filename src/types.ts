import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  alias?: string;
  index?: string;
  body?: string;
  path: string;
  x: string;
  y: string;
}

export const defaultQuery: Partial<MyQuery> = {
  index: '',
  body: '',
  path: 'aggregations.range.value',
  x: '',
  y: '',
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  path?: string;
}
