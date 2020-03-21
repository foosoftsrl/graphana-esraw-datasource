import defaults from 'lodash/defaults';

import React, { PureComponent, ChangeEvent } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './DataSource';
import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

interface State {}

export class QueryEditor extends PureComponent<Props, State> {
  onComponentDidMount() {}

  onConfigChange = (event: ChangeEvent) => {
    const { onChange, query } = this.props;
    onChange({ ...query });
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { index, path, x, y, body } = query;

    return (
      <div>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label query-keyword width-7">ES index</label>
            <input type="text" className="gf-form-input" value={index} placeholder="Immetere indice" onChange={this.onConfigChange} />
          </div>
        </div>

        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label query-keyword width-7">Data path</label>
            <input type="text" className="gf-form-input" value={path} placeholder="Path to array of key/value pairs" onChange={this.onConfigChange} />
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label query-keyword width-7">Time field</label>
            <input
              type="text"
              className="gf-form-input"
              value={x}
              placeholder="Name of the field containing timestamps"
              onChange={this.onConfigChange}
            />
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label query-keyword width-7">Value field</label>
            <input
              type="text"
              className="gf-form-input"
              value={y}
              placeholder="Name of the field containing value coord"
              onChange={this.onConfigChange}
            />
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label query-keyword width-7">Body</label>
            <textarea className="gf-form-input" rows={10} value={body} onChange={this.onConfigChange} />
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label query-keyword width-7">Body Ace</label>
            <div className="gf-form-input"></div>
          </div>
        </div>
      </div>
    );
  }
}
