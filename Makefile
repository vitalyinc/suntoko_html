cloudfront:
	aws cloudformation validate-template \
		--template-body file://templates/cloudfront.yml && \
	aws cloudformation deploy \
		--template-file ./templates/cloudfront.yml \
		--stack-name $(PROJECT)-$(ENV)-cloudfront \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
		--region us-east-1 \
		--parameter-overrides \
		Project=$(PROJECT) \
		Environment=$(ENV)