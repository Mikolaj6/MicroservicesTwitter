BASEDIR=$(dirname "$0")
cd $BASEDIR

if [[ -e ./commonDb.db ]]; then
    echo "Removing older commonDb.db file"
    rm -rf ./commonDb.db
fi    

touch commonDb.db
cd ./Setup

docker-compose build && docker-compose up && docker-compose down && echo "Setup successfull" || echo "Setup failed"
