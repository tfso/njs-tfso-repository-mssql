# DatabaseQuery

# tfso-repository-mssql@~1.0
uses mssql@3.3.0

# tfso-repository-mssql@~1.1
uses mssql@4.1.0

NB; remember that "Transaction and PreparedStatement internal queues was removed" so you may not execute queries in parallell anymore. Execute them in sequence.