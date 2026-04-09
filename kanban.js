/*
 * File Name: kanban.js
 * Description: Dynamic Kanban Board implementation for Oracle APEX
 * Features:
 *  - Builds Kanban UI dynamically
 *  - Fetches tasks via AJAX
 *  - Supports drag-and-drop using SortableJS
 *  - Updates task status in database
 */

(function () {

  /* ----------------------------------------------------------------------
   * Define available Kanban statuses (columns)
   * --------------------------------------------------------------------*/
  const STATUSES = ["TO DO", "IN PROGRESS", "DONE"];


  /* ----------------------------------------------------------------------
   * Function: buildSkeleton
   * Purpose : Creates the Kanban board structure dynamically
   * --------------------------------------------------------------------*/
  function buildSkeleton() {
    const region = document.getElementById("KANBAN_REGION");

    // Build HTML structure for columns
    region.innerHTML = `
      <div class="kanban-board">
        ${STATUSES.map(status => `
          <div class="kanban-col" data-status="${status}">
            <div class="kanban-col-header">${status}</div>
            <div class="kanban-list" id="list-${slug(status)}"></div>
          </div>
        `).join('')}
      </div>`;
  }


  /* ----------------------------------------------------------------------
   * Function: slug
   * Purpose : Convert status text into ID-friendly format
   * Example : "IN PROGRESS" → "in-progress"
   * --------------------------------------------------------------------*/
  function slug(text) {
    return text.toLowerCase().replace(/\s+/g, '-');
  }


  /* ----------------------------------------------------------------------
   * Function: dueClass
   * Purpose : Assign CSS class based on due date
   * --------------------------------------------------------------------*/
  function dueClass(isoDate) {
    if (!isoDate) return "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(isoDate);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "due-overdue";   // Past due
    if (diffDays <= 3) return "due-soon";     // Due soon
    return "due-later";                       // Future
  }


  /* ----------------------------------------------------------------------
   * Function: cardHTML
   * Purpose : Generate HTML for each task card
   * --------------------------------------------------------------------*/
  function cardHTML(task) {
    const klass = dueClass(task.due);
    const dueDate = task.due
      ? new Date(task.due).toLocaleDateString()
      : '-';

    return `
      <div class="kanban-card ${klass}" data-id="${task.id}">
        <div class="card-title">
          ${apex.util.escapeHTML(task.title)}
        </div>
        <div class="card-meta">
          ${apex.util.escapeHTML(task.assignee || '-')} | ${dueDate}
        </div>
      </div>`;
  }


  /* ----------------------------------------------------------------------
   * Function: renderTasks
   * Purpose : Populate tasks into respective Kanban columns
   * --------------------------------------------------------------------*/
  function renderTasks(tasks) {

    // Clear all existing task lists
    STATUSES.forEach(status => {
      const list = document.getElementById(`list-${slug(status)}`);
      if (list) list.innerHTML = "";
    });

    // Add tasks to respective columns
    tasks.forEach(task => {
      const status = STATUSES.includes(task.status)
        ? task.status
        : "TO DO";

      const list = document.getElementById(`list-${slug(status)}`);

      if (list) {
        list.insertAdjacentHTML('beforeend', cardHTML(task));
      }
    });
  }


  /* ----------------------------------------------------------------------
   * Function: enableDnD
   * Purpose : Enable drag-and-drop using SortableJS
   * --------------------------------------------------------------------*/
  function enableDnD() {
    document.querySelectorAll("#KANBAN_REGION .kanban-list").forEach(list => {

      Sortable.create(list, {
        group: "kanban",
        animation: 120,

        /* Triggered when a card is moved to another column */
        onAdd: function (evt) {

          const card = evt.item;  // Dragged element
          const taskId = card.dataset.id;

          // Get new status from column
          const newStatus = evt.to
            .closest(".kanban-col")
            .dataset.status;

          /* Call APEX AJAX process to update DB */
          apex.server.process(
            "UPDATE_TASK_STATUS",
            {
              x01: taskId,
              x02: newStatus
            },
            {
              dataType: "json",

              success: function () {
                // Optional: success message or animation
              },

              error: function (req, status, err) {
                console.error(err);

                // Revert card to original position on error
                evt.from.insertBefore(
                  card,
                  evt.from.children[evt.oldIndex] || null
                );

                apex.message.alert(
                  "Could not update status. Please try again."
                );
              }
            }
          );
        }
      });

    });
  }


  /* ----------------------------------------------------------------------
   * Function: fetchAndRender
   * Purpose : Fetch tasks from server and render Kanban board
   * --------------------------------------------------------------------*/
  function fetchAndRender() {

    apex.server.process(
      "FETCH_TASKS",
      {},
      {
        dataType: "json",

        success: function (tasks) {
          buildSkeleton();           // Create layout
          renderTasks(tasks || []);  // Populate tasks
          enableDnD();               // Enable drag & drop
        },

        error: function (req, status, err) {
          console.error(err);

          document.getElementById("KANBAN_REGION").innerHTML =
            "<p>Failed to load tasks.</p>";
        }
      }
    );
  }


  /* ----------------------------------------------------------------------
   * Initial Load
   * --------------------------------------------------------------------*/
  fetchAndRender();


  /* ----------------------------------------------------------------------
   * Expose function globally
   * So it can be used in APEX Dynamic Actions
   * --------------------------------------------------------------------*/
  window.fetchAndRenderKanban = fetchAndRender;


})();
