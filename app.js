import inquirer from 'inquirer';
import mysql2 from 'mysql2';

let managers = [];

const con = mysql2.createConnection({
    host: "localhost",
    user: "david",
    password: "david",
    database: "employeedb"
});

con.connect(err => {
    if (err) throw err;
    console.log("Connected to the database!");
    mainMenu();
});

let menuDisplayed = false;

function mainMenu() {
    if (menuDisplayed) {
        return;
    }
    menuDisplayed = true;
    inquirer
        .prompt({
            type: "list",
            name: "choice",
            message: "What would you like to do?",
            choices: [
                "View all employees",
                "View all employees by department",
                "View all employees by manager",
                "Add employee",
                "Remove employee",
                "Update employee role",
                "Update employee manager",
                "Exit"
            ]
        })
        .then(answer => {
            switch (answer.choice) {
                case "View all employees":
                    viewAllEmployees();
                    break;
                case "View all employees by department":
                    viewByDepartment();
                    break;
                case "View all employees by manager":
                    viewByManager();
                    break;
                case "Add employee":
                    addEmployee();
                    break;
                case "Remove employee":
                    removeEmployee();
                    break;
                case "Update employee role":
                    updateRole();
                    break;
                case "Update employee manager":
                    updateManager();
                    break;
                default:
                    con.end();
                    break;
            }
        });
}

function viewAllEmployees() {
    const query = `
        SELECT
            employees.id,
            employees.first_name,
            employees.last_name,
            role.title,
            department.name AS department,
            role.salary,
            manager.first_name AS manager_first_name,
            manager.last_name AS manager_last_name
        FROM employees
        LEFT JOIN role ON employees.role_id = role.id
        LEFT JOIN department ON role.department_id = department.id
        LEFT JOIN employees manager ON employees.manager_id = manager.id;
    `;

    con.query(query, (err, result) => {
        if (err) throw err;
        console.table(result.map(row => ({
            "ID": row.id,
            "First Name": row.first_name,
            "Last Name": row.last_name,
            "Title": row.title,
            "Salary": row.salary,
            "Department": row.department,
            "Manager": `${row.manager_first_name} ${row.manager_last_name}`
        })));
        menuDisplayed = false;
        mainMenu();
    });
}




function viewByDepartment() {
    const departmentsQuery = `
      SELECT * FROM department;
    `;
    con.query(departmentsQuery, (err, departments) => {
      if (err) throw err;
  
      inquirer
        .prompt({
          type: "list",
          name: "department",
          message: "Which department would you like to view?",
          choices: departments.map(department => department.name)
        })
        .then(answer => {
          const employeesQuery = `
            SELECT employees.first_name, employees.last_name, role.title, department.name AS department
            FROM employees
            INNER JOIN role ON employees.role_id = role.id
            INNER JOIN department ON role.department_id = department.id
            WHERE department.name = ?
            ORDER BY employees.last_name;
          `;
          con.query(employeesQuery, answer.department, (err, employees) => {
            if (err) throw err;
  
            console.table(employees);
            menuDisplayed = false;
            mainMenu();
          });
        });
    });
  }
  



function viewByManager() {
    let managersList;
  
    const managersQuery = `
      SELECT id, CONCAT_WS(' ', first_name, last_name) AS name
      FROM employees
      WHERE role_id IN (
        SELECT id FROM role WHERE title LIKE '%manager%'
      )
      ORDER BY name;
    `;
    con.query(managersQuery, (err, managers) => {
      if (err) throw err;
  
      managersList = managers.map(manager => ({
        name: manager.name,
        value: manager.id
      }));
  
      inquirer
        .prompt({
          type: "list",
          name: "manager",
          message: "Select a manager to view their employees:",
          choices: managersList
        })
        .then(answers => {
          const query = `
            SELECT CONCAT_WS(' ', e.first_name, e.last_name) AS name, r.title AS role
            FROM employees e
            JOIN role r ON e.role_id = r.id
            WHERE e.manager_id = ${answers.manager};
          `;
          con.query(query, (err, results) => {
            if (err) throw err;
  
            console.table(results);
            menuDisplayed = false;
            mainMenu();
          });
        });
    });
  }
  
  

function addEmployee() {
    con.query("SELECT title, id FROM role", (err, role) => {
        if (err) throw err;

        const roleChoices = role.map(role => ({
            name: role.title,
            value: role.id
        }));

        con.query(
            `SELECT employees.id, employees.first_name, employees.last_name FROM employees 
            LEFT JOIN role ON role.id = employees.role_id 
            WHERE role.title LIKE "%manager%"`,
            (err, managers) => {
                if (err) throw err;

                const managerChoices = managers.map(manager => ({
                    name: `${manager.first_name} ${manager.last_name}`,
                    value: manager.id
                }));

                inquirer
                    .prompt([
                        {
                            type: "input",
                            name: "first_name",
                            message: "Enter the employee's first name:"
                        },
                        {
                            type: "input",
                            name: "last_name",
                            message: "Enter the employee's last name:"
                        },
                        {
                            type: "list",
                            name: "role_id",
                            message: "Select the employee's role:",
                            choices: roleChoices
                        },
                        {
                            type: "list",
                            name: "manager_id",
                            message: "Select the employee's manager:",
                            choices: [...managerChoices, { name: "None", value: null }]
                        }
                    ])
                    .then(answers => {
                        const query = `
                            INSERT INTO employees (first_name, last_name, role_id, manager_id)
                            VALUES ('${answers.first_name}', '${answers.last_name}', ${answers.role_id}, ${answers.manager_id})
                        `;
                        con.query(query, (err, result) => {
                            if (err) throw err;
                            console.log("Employee added to the database.");
                            menuDisplayed = false;
                            mainMenu();
                        });
                    });
            }
        );
    });
}







function updateRole() {
    let employeesList;
    let rolesList;

    const employeesQuery = `
        SELECT id, first_name, last_name FROM employees;
    `;
    con.query(employeesQuery, (err, employees) => {
        if (err) throw err;
        employeesList = employees.map(employee => ({
            name: `${employee.first_name} ${employee.last_name}`,
            value: employee.id
        }));

        const rolesQuery = `
            SELECT id, title FROM role;
        `;
        con.query(rolesQuery, (err, roles) => {
            if (err) throw err;
            rolesList = roles.map(role => ({
                name: role.title,
                value: role.id
            }));

            inquirer
                .prompt([
                    {
                        type: "list",
                        name: "employee",
                        message: "Choose an employee to update:",
                        choices: employeesList
                    },
                    {
                        type: "list",
                        name: "role",
                        message: "Choose a new role:",
                        choices: rolesList
                    }
                ])
                .then(answers => {
                    const query = `
                        UPDATE employees SET role_id = ${answers.role}
                        WHERE id = ${answers.employee};
                    `;
                    con.query(query, (err, result) => {
                        if (err) throw err;
                        console.log("Employee role updated.");

                        if (roles.find(role => role.id === answers.role).title === "Manager") {
                            managers.push(employees.find(employee => employee.id === answers.employee));
                        }
                        menuDisplayed = false;
                        mainMenu();
                    });
                });
        });
    });
}








async function queryPromise(query) {
    return new Promise((resolve, reject) => {
        con.query(query, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

async function getManagersList() {
    const query = `
        SELECT id, first_name, last_name
        FROM employees
        WHERE manager_id IS NULL;
    `;
    const managers = await queryPromise(query);
    return managers.map(manager => ({
        name: `${manager.first_name} ${manager.last_name}`,
        value: manager.id
    }));
}

function updateManager() {
    let employeesList;
    let managersList;

    const employeesQuery = `
      SELECT id, first_name, last_name FROM employees;
    `;
    con.query(employeesQuery, (err, employees) => {
        if (err) throw err;
        employeesList = employees.map(employee => ({
            name: `${employee.first_name} ${employee.last_name}`,
            value: employee.id
        }));

        const managersQuery = `
        SELECT id, first_name, last_name FROM employees
        WHERE role_id IN (
          SELECT id FROM role WHERE title = "Manager"
        );
      `;
        con.query(managersQuery, (err, managers) => {
            if (err) throw err;
            managersList = [
                { name: "No manager", value: null },
                ...managers.map(manager => ({
                    name: `${manager.first_name} ${manager.last_name}`,
                    value: manager.id
                }))
            ];

            inquirer
                .prompt([
                    {
                        type: "list",
                        name: "employee",
                        message: "Choose an employee to update:",
                        choices: employeesList
                    },
                    {
                        type: "list",
                        name: "manager",
                        message: "Choose a new manager or select 'No manager':",
                        choices: managersList
                    }
                ])
                .then(answers => {
                    const query = `
              UPDATE employees SET manager_id = ${answers.manager}
              WHERE id = ${answers.employee};
            `;
                    con.query(query, (err, result) => {
                        if (err) throw err;
                        console.log("Employee manager updated.");

                        menuDisplayed = false;
                        mainMenu();
                    });
                });
        });
    });
}





const removeEmployee = async () => {
    const [employees] = await con.promise().query('SELECT * FROM employees');
    const employeeNames = employees.map(emp => `${emp.first_name} ${emp.last_name}`);
    const { employeeName } = await inquirer.prompt({
        type: 'list',
        message: 'Which employee do you want to remove?',
        choices: employeeNames,
        name: 'employeeName'
    });

    const employee = employees.find(emp => `${emp.first_name} ${emp.last_name}` === employeeName);
    const { isManager, id } = employee;

    if (isManager) {
        const [subordinates] = await con.promise().query('SELECT * FROM employees WHERE manager_id = ?', [id]);
        if (subordinates.length > 0) {
            const { confirm } = await inquirer.prompt({
                type: 'confirm',
                message: 'This employee is a manager. Do you want to reassign their subordinates to a different manager?',
                name: 'confirm'
            });
            if (confirm) {
                const managerChoices = employees
                    .filter(emp => emp.id !== id && !emp.isManager)
                    .map(emp => ({
                        name: `${emp.first_name} ${emp.last_name}`,
                        value: emp.id
                    }));
                const { newManagerId } = await inquirer.prompt({
                    type: 'list',
                    message: 'Which employee do you want to set as the new manager for the subordinates?',
                    choices: managerChoices,
                    name: 'newManagerId'
                });
                await con.promise().execute(
                    'UPDATE employees SET manager_id = ? WHERE manager_id = ?',
                    [newManagerId, id]
                );
            } else {
                return;
            }
        }
    } else {
        await con.promise().execute(
            'UPDATE employees SET manager_id = NULL WHERE manager_id = ?',
            [id]
        );
    }

    const [deletedEmployee] = await con.promise().execute(
        'DELETE FROM employees WHERE id = ?',
        [id]
    );
    console.log(`${deletedEmployee.affectedRows} employee has been deleted.`);
    menuDisplayed = false;
    mainMenu();
};






mainMenu();