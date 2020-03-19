import * as hjson from './hjson.js';
import _ from "lodash";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = {'Content-Type': 'application/json'};
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
  }

  query(options) {
    console.log('Querying with options: ', options)
    
    const path = options.targets[0].path
    const index = options.targets[0].index
    const body = options.targets[0].body

    var query = options// = this.buildQueryParameters(options);
    query.targets = query.targets.filter(t => !t.hide);
    if (query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    if (this.templateSrv.getAdhocFilters) {
      query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
    } else {
      query.adhocFilters = [];
    }
    
    // Make sure that the range is defined  
    if (options && options.range && options.range.from && options.range.to) {
      // Interpolate body
      var bodyHjson = this.templateSrv.replace(body, {}, 'glob');

      // Parse hjson body to a javacript variable
      const bodyObject = hjson.parse(bodyHjson);
      
//      const otherTrimmedBody = _.trim(body)
//      console.log('Other trimmed body', otherTrimmedBody)

      // Make request to Elastic Search
      return this.doRequest({
        url: `${this.url}/${index}/_search`,
        data: bodyObject,
        method: 'POST'
      }).then(res => {
        console.log('Got elastich search result')
        console.log('Options', options)
        console.log('Targets', options.targets)
        console.log('Target', options.targets[0])
        console.log('X key', xKey)
        console.log('Y key', yKey)
        console.log('Path', path)
        // Get path
        const path = options.targets[0].path
        console.log('Path', path)
        const value = _.get(res.data, path)
        console.log('Path value', value)
        // Get x/y keys
        const xKey = options.targets[0].x
        const yKey = options.targets[0].y
        console.log('x key', xKey);
        console.log('y key', yKey);
        // Map the data points to a timeserie
        const dataPoints = value.map(v => [v[yKey], v[xKey]])
        return {data:[
            {
              datapoints:dataPoints
            }
          ]
        }
      }) 
    }
  }

  testDatasource() {
    return this.doRequest({
      url: this.url + '/',
      method: 'GET',
    }).then(response => {
      if (response.status === 200) {
        return { status: "success", message: "Data source is working", title: "Success" };
      }
    });
  }

  annotationQuery(options) {
    console.log('Calling annotations function');
    var query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
    var annotationQuery = {
      range: options.range,
      annotation: {
        name: options.annotation.name,
        datasource: options.annotation.datasource,
        enable: options.annotation.enable,
        iconColor: options.annotation.iconColor,
        query: query
      },
      rangeRaw: options.rangeRaw
    };

    return this.doRequest({
      url: this.url + '/annotations',
      method: 'POST',
      data: annotationQuery
    }).then(result => {
      return result.data;
    });
  }

  metricFindQuery(query) {
    var interpolated = {
        target: this.templateSrv.replace(query, null, 'regex')
    };
    
    return Promise.resolve([{text: 'upper_75', value: '1'}, {text: 'upper_90', value: '2'}]) 
     // new Promise((resolve, reject) => {
     // resolve(['upper_75', 'upper_90'])
    //})
    //return this.doRequest({
    //  url: this.url + '/search',
    //  data: interpolated,
    //  method: 'POST',
    //}).then(this.mapToTextValue);
  }

  mapToTextValue(result) {
    return _.map(result.data, (d, i) => {
      if (d && d.text && d.value) {
        return { text: d.text, value: d.value };
      } else if (_.isObject(d)) {
        return { text: d, value: i};
      }
      return { text: d, value: d };
    });
  }

  doRequest(options) {
    options.withCredentials = this.withCredentials;
    options.headers = this.headers;

    return this.backendSrv.datasourceRequest(options);
  }

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.target !== 'select metric';
    });

    var targets = _.map(options.targets, target => {
      return {
        target: this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
        refId: target.refId,
        hide: target.hide,
        type: target.type || 'timeserie'
      };
    });

    options.targets = targets;

    return options;
  }

  getTagKeys(options) {
    return new Promise((resolve, reject) => {
      this.doRequest({
        url: this.url + '/tag-keys',
        method: 'POST',
        data: options
      }).then(result => {
        return resolve(result.data);
      });
    });
  }

  getTagValues(options) {
    return new Promise((resolve, reject) => {
      this.doRequest({
        url: this.url + '/tag-values',
        method: 'POST',
        data: options
      }).then(result => {
        return resolve(result.data);
      });
    });
  }

}
