/*
 * File Name : kanban_ajax.sql
 * Description :
 *   Contains AJAX Callback processes for Kanban Board in Oracle APEX
 *
 * Processes Included:
 *   1. FETCH_TASKS          - Returns task data in JSON format
 *   2. UPDATE_TASK_STATUS   - Updates task status after drag-and-drop
 */


--------------------------------------------------------------------------------
-- AJAX Callback 1: FETCH_TASKS
-- Purpose : Fetch all tasks and return as JSON
--------------------------------------------------------------------------------
DECLARE
  l_json CLOB;
BEGIN
  SELECT JSON_ARRAYAGG(
           JSON_OBJECT(
             'id'       VALUE task_id,
             'title'    VALUE task_name,
             'status'   VALUE status,
             'assignee' VALUE assignee,
             'due'      VALUE TO_CHAR(due_date, 'YYYY-MM-DD')
           )
         )
  INTO l_json
  FROM project_tasks;

  -- Set HTTP response headers
  owa_util.mime_header('application/json', FALSE);
  htp.p('Cache-Control: no-cache');
  owa_util.http_header_close;

  -- Return JSON response (empty array if no data)
  htp.p(COALESCE(l_json, '[]'));
END;
/


--------------------------------------------------------------------------------
-- AJAX Callback 2: UPDATE_TASK_STATUS
-- Purpose : Update task status when card is moved
--------------------------------------------------------------------------------
BEGIN
  UPDATE project_tasks
     SET status = apex_application.g_x02
   WHERE task_id = TO_NUMBER(apex_application.g_x01);

  COMMIT;

  -- Set HTTP response headers
  owa_util.mime_header('application/json', FALSE);
  htp.p('Cache-Control: no-cache');
  owa_util.http_header_close;

  -- Return success response
  htp.p('{"ok": true}');
END;
/
