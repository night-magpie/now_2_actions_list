import {createCustomElement, actionTypes} from '@servicenow/ui-core';
const  {COMPONENT_BOOTSTRAPPED} = actionTypes;
import snabbdom from '@servicenow/ui-renderer-snabbdom';
import styles from './styles.scss';
import { createHttpEffect } from '@servicenow/ui-effect-http';
import '@servicenow/now-template-card';
import '@servicenow/now-modal';	
import '@servicenow/now-highlighted-value'

const view = (state, {updateState}) => {
	const {drawable, incidentList, preview} = state;

	function buildIncidentCard(incident)
	{
		return (<now-template-card-assist
			tagline={{ "icon": "tree-view-long-outline", "label": "Incident" }}
			actions={[{ "id": {action: "open", id: incident["number"]}, "label": "Open Record" },
					  { "id": {action: "delete", id: incident["number"]}, "label": "Delete" }]}
			heading={{ "label": incident["short_description"] }}
			content={[{ "label": "Number", "value": { "type": "string", "value": incident["number"] }}, 
					  { "label": "State", "value": { "type": "string", "value": incident["state"] } }, 
					  { "label": "Assignment group", "value": { "type": "string", "value": incident["assignment_group"]["display_value"] } }, 
					  { "label": "Assigned To", "value": { "type": "string", "value": incident["assigned_to"]["display_value"] } }]} 
			contentItemMinWidth="300"
			footerContent={{ "label": "Updated", "value": incident["sys_updated_on"] }} 
			configAria={{}}>
			</now-template-card-assist>);
	}

	function cardListToHTML(list)
	{
		let output = [];
		
		if ((list != null) && (list.length > 0))
		{
			list.forEach(incident => {output.push(buildIncidentCard(incident));});
			

			updateState({drawable : {requireUpdate: false, data: output}})
			return output;
		}
		else return "Loading data...";
	}

	return (
		<div>
			<div>{drawable.requireUpdate ? cardListToHTML(incidentList) : drawable.data}</div>
			<div>{preview.data}</div>			
		</div>
	);
};

createCustomElement('x-550126-action-list', {
	actionHandlers: {
		[COMPONENT_BOOTSTRAPPED]: (coeffects) => {
			const { dispatch } = coeffects;
		
			dispatch('FETCH_INCIDENT_LIST');
		},
		'FETCH_INCIDENT_LIST': createHttpEffect('api/now/table/incident?sysparm_display_value=true', {
			method: 'GET',
			successActionType: 'FETCH_INCIDENT_LIST_SUCCESS'
		}),
		'FETCH_INCIDENT_LIST_SUCCESS': (coeffects) => {
			const { action, updateState } = coeffects;
			const { result } = action.payload;

			updateState({incidentList: result, drawable: {requireUpdate: true} });
		},
		'NOW_DROPDOWN_PANEL#ITEM_CLICKED': (coeffects) => {
			//coeffects = {action, dispatch, updateState, updateProperties, state, properties};
			const {action, dispatch, updateState} = coeffects;
			const {id} = action.payload.item;

			switch (id.action)
			{
				case "open":	dispatch('OPEN_RECORD_IN_MODAL_WINDOW'	, {item_clicked: id}); break;
				case "delete":	dispatch('DELETE_INCIDENT_FROM_LIST'	, {item_clicked: id}); break;
			}
			
			//updateState({fields});
		},
		'OPEN_RECORD_IN_MODAL_WINDOW':	(coeffects) => {
			const {updateState, state} = coeffects;
			const {item_clicked} = coeffects.action.payload;
			const {incidentList} = state;

			let incident = incidentList.filter((incident) => {
				return incident.number == item_clicked.id;

			})[0];			
			
			updateState({preview: {opened: true}});
			updateState({preview: {data: (
				<now-modal
				opened={true}
				size="lg"
				headerLabel={incident.short_description}
				content=
					{
				<div>
				<table>
					<tr><td>
						<now-label-value-inline label="Number:" value={incident.number}></now-label-value-inline><br/>
						<now-label-value-inline label="State:" value={incident.state}></now-label-value-inline><br/>
						<now-label-value-inline label="Priority:" value={incident.priority}></now-label-value-inline><br/>
						</td>
					</tr>
					<tr>
						<td>
						{(incident.assignment_group.display_value != null)
						 ?
						 (<span><now-label-value-inline label="Assignment group:" value={incident.assignment_group.display_value}></now-label-value-inline><br/></span>)
						 :
					   	 ("")
						}
						{(incident.assignment_group.display_value != null)
						 ?
						 (<span><now-label-value-inline label="Asigned to:" value={incident.assigned_to.display_value} ></now-label-value-inline><br/></span>)
						 :
						 ("")
						}
						</td>
					</tr>
				</table>

				<p>{'\n'+incident.description+'\n'}</p>
				
				<p>
					<now-label-value-inline label="Opened:" value={incident.opened_at + " by: " + incident.opened_by.display_value}></now-label-value-inline><br/>
					{(incident.resolved_at != "")
				 	 ?
					 (<span><now-label-value-inline label="Resolved:" value={incident.resolved_at + " by: " + incident.resolved_by.display_value}></now-label-value-inline><br/></span>)
					 :
					 ("")
					}
					{(incident.closed_at != "")
					 ?
					 (<span><now-label-value-inline label="Closed:" value={incident.closed_at + " by: " + incident.closed_by.display_value}></now-label-value-inline><br/></span>)
					 :
					 ("")
					}
				</p>
				</div>}
				
				footerActions="">
				</now-modal>)}});
		},
		'NOW_MODAL#OPENED_SET': (coeffects) => {
			const {updateState} = coeffects;

			updateState({preview:{opened: false}});
		},
		'DELETE_INCIDENT_FROM_LIST':	(coeffects) => {
			const {state, dispatch} = coeffects;
			const {item_clicked} = coeffects.action.payload;
			const {incidentList} = state;
			
			let incident = incidentList.filter((incident) => {
				return incident.number == item_clicked.id;
			})[0];

			dispatch('HTTP_EFFECT_DELETE_ELEMENT',{sys_id: incident.sys_id});
		},
		'HTTP_EFFECT_DELETE_ELEMENT': createHttpEffect('api/now/table/incident/:sys_id', {
			method: 'DELETE',
			pathParams: ['sys_id'],
			startActionType: 'DELETE_INCIDENT_ON_START',
			successActionType: 'DELETE_INCIDENT_ON_SUCCESS',
			errorActionType: 'DELETE_INCIDENT_ON_ERROR'
		}),
		'DELETE_INCIDENT_ON_START': (coeffects) => {
			//console.log('deletion started');
		},
		'DELETE_INCIDENT_ON_SUCCESS': (coeffects) => {
			const {dispatch} = coeffects;
			dispatch('FETCH_INCIDENT_LIST');
			//console.log('item deleted');
		},
		'DELETE_INCIDENT_ON_ERROR': (coeffects) => {
			//console.log('failed to delete record');
		}
	},
	
	renderer: {type: snabbdom},
	initialState: {
		incidentList: [],
		preview: {opened: false, data: ""},
		drawable: {requireUpdate: true, data: []}
	},
	view,
	styles
});
