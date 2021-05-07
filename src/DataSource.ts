import _ from 'lodash';

import { DataQueryRequest, DataQueryResponse, DataSourceApi, DataSourceInstanceSettings } from '@grafana/data';

import { MyQuery, MyDataSourceOptions } from './types';

import * as hjson from 'hjson';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  name: string;
  url?: string;
  basicAuth?: string;
  withCredentials?: boolean;

  constructor(
    instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>,
    private templateSrv: any,
    private backendSrv: any,
    variableSrv: any
  ) {
    super(instanceSettings);

    // General data source settings
    this.name = instanceSettings.name;
    this.url = instanceSettings.url;
    this.basicAuth = instanceSettings.basicAuth;
    this.withCredentials = instanceSettings.withCredentials;
    (window as any).variableSrv = variableSrv;
  }

  query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    // Select only enabled targets
    const targets = options.targets.filter((t) => {
      return !t.hide;
    });

    if (targets.length <= 0) {
      return Promise.resolve({ data: [] });
    }

    // Prepare a range filter on timestamp field
    /*
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();
    */
    /*
    const rangeFilter = {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
        },
      },
    };
    */

    // Ad hoc filters will be inserted as-is in the query
    const adhocFilters = this.templateSrv.getAdhocFilters(this.name);
    console.log('adhoc filters = ' + JSON.stringify(adhocFilters));

    // Accumulate the targets into an ES msearch request body
    let reqContent = '';
    targets.forEach((target: MyQuery) => {
      reqContent += JSON.stringify({ index: target.index }) + '\n';
      // Interpolate body
      const bodyHjson = this.templateSrv.replace(target.body, {}, 'glob');
      // Parse hjson body to a javacript variable
      const bodyObject = hjson.parse(bodyHjson);

      const filters = [];
      // Add the query in the body, if present
      const oldQuery = bodyObject.query;
      if (oldQuery) {
        filters.push(oldQuery);
      }
      adhocFilters.forEach((adhocFilter: any) => {
        const { key, value, operator } = adhocFilter;
        console.log('key = ' + key + ' value = ' + value + ' operator = ' + operator);
        // if we have no value, this is a "raw" filter. let's parse it and add it to the filter list
        if (operator === 'query') {
          const filter = hjson.parse(value);
          filters.push(filter);
        } else if (operator === 'query_string') {
          if (value && value.trim().length) {
            const query = {
              query_string: {
                analyze_wildcard: true,
                query: value,
              },
            };
            filters.push(query);
          }
        } else {
          console.log('No support (yet) for key/value ad-hoc filters');
        }
      });
      bodyObject.query = {
        bool: {
          must: filters,
        },
      };

      // Concatenate body
      reqContent += JSON.stringify(bodyObject) + '\n';
    });
    // Make request to Elastic Search
    return this.doRequest({
      url: this.url + '/_msearch',
      data: reqContent,
      method: 'POST',
    }).then((res: any) => {
      return this.mapResponse(options, targets, res);
    });
  }

  doRequest(options: any) {
    options.withCredentials = this.withCredentials;
    //options.headers = this.headers;
    return this.backendSrv.datasourceRequest(options);
  }

  // Convert ES response to grafana DataSourceResponse
  mapResponse(options: DataQueryRequest<MyQuery>, targets: MyQuery[], res: any) {
    const resultArray = [];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const targetResponse = res.data.responses[i];
      if (target.splitPath && target.splitPath.length) {
        const { x, y, splitPath } = target;
        const seriesList = _.get(targetResponse, splitPath);
        if (!seriesList) {
          throw new Error('No data @splitPath ' + splitPath);
        }
        if (!Array.isArray(seriesList)) {
          throw new Error('Not an array @' + splitPath);
        }
        seriesList.forEach((series) => {
          const targetData = {
            target: (series as any)[x],
            datapoints: [[_.get(series, y), options.range!.from.valueOf()]],
          };
          resultArray.push(targetData);
        });
      } else {
        const path = target.path;
        if (!path) {
          throw new Error('No path option');
        }
        console.log('Path', path);
        const value = _.get(targetResponse, path);
        if (!value) {
          throw new Error('No data @path ' + path);
        }
        if (!Array.isArray(value)) {
          throw new Error('Not an array @' + path);
        }
        // Get x/y keys
        const xKey = target.x;
        const yKey = target.y;
        // Map the data points to a timeserie
        if (value.length) {
          if (!(xKey in value[0])) {
            throw new Error("Can't find '" + xKey + "' property in response");
          }
          if (!_.has(value[0], yKey)) {
            throw new Error("Can't find '" + yKey + "' property in response");
          }
        }
        const dataPoints = value.map((v) => [_.get(v, yKey), _.get(v, xKey)]);
        const targetData = {
          target: target.alias ? target.alias : 'value',
          datapoints: dataPoints,
        };
        resultArray.push(targetData);
      }
    }
    return { data: resultArray };
  }

  testDatasource() {
    return this.doRequest({ url: this.url + '/', method: 'GET' }).then((response: any) => {
      if (response.status === 200) {
        return { status: 'success', message: 'Data source is working', title: 'Success' };
      } else {
        throw new Error('Invalid response status ' + response.status);
      }
    });
  }
  getTagKeys() {
    return Promise.resolve([]);
  }

  /*
  getTagValues(options: any) {
    return this.getTerms({ field: options.key, query: '*' });
  }
*/
}
